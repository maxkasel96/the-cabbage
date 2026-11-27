-- One roster place per account. Unclaimed rows are invitations, scoped to a verified email.
create table public.player_memberships (
  player_id uuid primary key references public.players(id) on delete cascade,
  invited_email text not null check (invited_email = lower(trim(invited_email)) and invited_email <> ''),
  user_id uuid unique references auth.users(id) on delete cascade,
  is_active boolean not null default true
);
create unique index player_memberships_pending_email on public.player_memberships(invited_email) where user_id is null;
alter table public.player_memberships enable row level security;
revoke all on public.player_memberships from public, anon, authenticated;
grant all on public.player_memberships to service_role;

-- Conflicting legacy links must stop the migration for manual reconciliation.
insert into public.player_memberships(player_id, invited_email, user_id, is_active)
select i.player_id, lower(trim(i.email)), i.auth_user_id, i.is_active and coalesce(p.is_active,true)
from public.player_login_identities i left join public.user_profiles p on p.user_id=i.auth_user_id;

do $$
begin
  if exists (select 1 from public.user_profiles p join public.player_memberships m
    on m.player_id=p.player_id where m.user_id is not null and m.user_id<>p.user_id)
  then raise exception 'Conflicting roster links require review'; end if;
end $$;
-- A previously cleared approval remains pending. Never reclaim it from a stale profile link.
insert into public.player_memberships(player_id, invited_email, user_id, is_active)
select p.player_id, lower(trim(u.email)), p.user_id, p.is_active
from public.user_profiles p join auth.users u on u.id=p.user_id
where p.player_id is not null and not exists
  (select 1 from public.player_memberships m where m.player_id=p.player_id);

alter table public.user_profiles add column if not exists profile_data jsonb not null default '{}'::jsonb;
alter table public.user_profiles drop constraint if exists user_profiles_role_check;
update public.user_profiles p set role=case when u.raw_app_meta_data->>'role'='admin' then 'admin' else 'standard' end
from auth.users u where u.id=p.user_id;
alter table public.user_profiles alter column role set default 'standard',
  add constraint user_profiles_role_check check(role in ('admin','standard'));

create or replace function public.sync_user_profile_from_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.user_profiles(user_id,email,display_name,role,last_sign_in_at)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'display_name',new.raw_user_meta_data->>'name'),
    case when new.raw_app_meta_data->>'role'='admin' then 'admin' else 'standard' end,new.last_sign_in_at)
  on conflict(user_id) do update set email=excluded.email, role=excluded.role, last_sign_in_at=excluded.last_sign_in_at;
  return new;
end $$;

insert into public.user_profiles(user_id,email,display_name,role,last_sign_in_at)
select id,email,coalesce(raw_user_meta_data->>'display_name',raw_user_meta_data->>'name'),
  case when raw_app_meta_data->>'role'='admin' then 'admin' else 'standard' end,last_sign_in_at
from auth.users on conflict(user_id) do nothing;

-- Caller identity comes from the verified Supabase session. Locking makes concurrent callbacks idempotent.
create function public.accept_player_invitation() returns uuid
language plpgsql security definer set search_path='' as $$
declare
  account auth.users%rowtype;
  membership public.player_memberships%rowtype;
  claims jsonb := auth.jwt();
begin
  select * into strict account from auth.users where id=auth.uid() for update;
  select * into membership from public.player_memberships where user_id=account.id for update;
  -- Automatic email confirmation can set a timestamp on a password signup.
  -- For the first link, also require evidence from the signed sign-in session.
  if not found and account.email_confirmed_at is not null
    and lower(claims->>'email') = lower(account.email)
    and (
      claims->'amr' @> '[{"method":"magiclink"}]'::jsonb
      or (claims->'amr' @> '[{"method":"otp"}]'::jsonb
        and coalesce(claims->>'phone','') = '' and coalesce(account.phone,'') = '')
      or (claims->'amr' @> '[{"method":"oauth"}]'::jsonb and exists (
        select 1 from auth.identities i where i.user_id=account.id and i.provider='google'
          and i.identity_data->>'email_verified'='true'
          and lower(i.identity_data->>'email')=lower(account.email)
      ))
    ) then
    select * into membership from public.player_memberships
    where user_id is null and invited_email=lower(trim(account.email)) for update;
  end if;
  if membership.player_id is null and account.raw_app_meta_data->>'role'='admin' then return null; end if;
  if membership.player_id is null or not membership.is_active or not exists
    (select 1 from public.players where id=membership.player_id and is_active)
  then raise exception 'An active player invitation or membership is required.' using errcode='42501'; end if;
  if membership.user_id is null then
    update public.player_memberships set user_id=account.id where player_id=membership.player_id;
  end if;
  return membership.player_id;
end $$;
revoke all on function public.accept_player_invitation() from public, anon;
grant execute on function public.accept_player_invitation() to authenticated;

create schema if not exists cabbage_private;
revoke all on schema cabbage_private from public;
grant usage on schema cabbage_private to authenticated;
create function cabbage_private.member_player() returns uuid language sql stable security definer set search_path='' as $$
  select m.player_id from public.player_memberships m join public.players p on p.id=m.player_id
  where m.user_id=auth.uid() and m.is_active and p.is_active
$$;
create function cabbage_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from auth.users u where u.id=auth.uid() and u.raw_app_meta_data->>'role'='admin'
    and not exists(select 1 from public.player_memberships m join public.players p on p.id=m.player_id
      where m.user_id=u.id and not (m.is_active and p.is_active)))
$$;
revoke all on all functions in schema cabbage_private from public,anon;
grant execute on all functions in schema cabbage_private to authenticated;

-- Archive the legacy approval data in place. Close the previous claim and token entry points.
revoke all on public.player_login_identities, public.user_profiles from public,anon,authenticated;
grant select on public.user_profiles to authenticated;
do $$
declare legacy regprocedure;
begin
  for legacy in select oid::regprocedure from pg_proc where pronamespace='public'::regnamespace and
    proname in ('claim_player_login_identity','issue_player_login_token','redeem_player_login_token')
  loop execute format('revoke execute on function %s from public,anon,authenticated,service_role',legacy); end loop;
end $$;

-- Replace all permissive write policies on these feature-owned tables, including production-only ones.
do $$
declare policy record;
begin
  for policy in select tablename,policyname from pg_policies where schemaname='public'
    and tablename in ('posts','rules','user_profiles')
  loop execute format('drop policy %I on public.%I',policy.policyname,policy.tablename); end loop;
end $$;
create policy own_profile_read on public.user_profiles for select to authenticated using(user_id=(select auth.uid()));
alter table public.posts add column author_user_id uuid references auth.users(id) on delete set null;
update public.posts s set author_user_id=m.user_id from public.player_memberships m
where s.author_id=m.player_id and m.user_id is not null;

alter table public.posts enable row level security;
alter table public.rules enable row level security;
revoke all on public.posts,public.rules from public,anon,authenticated;
grant select on public.posts,public.rules to anon,authenticated;
grant insert(tournament_id,author_id,author_user_id,author_name,message,images),update(message,images),delete on public.posts to authenticated;
grant insert(tournament_id,content,status),update(status,updated_at),delete on public.rules to authenticated;
do $$
declare sequence_name regclass := pg_get_serial_sequence('public.posts','id')::regclass;
begin
  if sequence_name is not null then execute format('grant usage on sequence %s to authenticated',sequence_name); end if;
end $$;
create policy public_posts on public.posts for select using(true);
create policy write_own_posts on public.posts for insert to authenticated with check(
  author_user_id=(select auth.uid()) and author_id=(select cabbage_private.member_player())
  and exists(select 1 from public.players p where p.id=author_id and p.display_name=author_name));
create policy edit_posts on public.posts for update to authenticated using(
  (author_user_id=(select auth.uid()) and (select cabbage_private.member_player()) is not null) or (select cabbage_private.is_admin()));
create policy delete_posts on public.posts for delete to authenticated using(
  (author_user_id=(select auth.uid()) and (select cabbage_private.member_player()) is not null) or (select cabbage_private.is_admin()));
create policy public_rules on public.rules for select using(true);
create policy propose_rules on public.rules for insert to authenticated with check(
  status='Proposed' and (select cabbage_private.member_player()) is not null);
create policy moderate_rules on public.rules for update to authenticated using((select cabbage_private.is_admin()));
create policy remove_rules on public.rules for delete to authenticated using((select cabbage_private.is_admin()));

-- Official game, roster and configuration changes go through admin-checked server handlers.
do $$
declare name text;
begin
  foreach name in array array['games','game_tags','game_winners','plays','play_winners','play_players',
    'player_losses_by_tournament','players','tournaments','tournament_players','tags','spotify_favorite_playlists']
  loop
    if to_regclass(format('public.%I',name)) is not null then
      execute format('revoke insert,update,delete,truncate,references,trigger on public.%I from public,anon,authenticated',name);
    end if;
  end loop;
end $$;

-- Merge individual fields under the row lock so a concurrent photo upload and bio edit both survive.
create function public.update_member_profile_fields(p_user_id uuid, p_fields jsonb, p_display_name text default null)
returns setof public.user_profiles language sql security invoker set search_path='' as $$
  update public.user_profiles set profile_data=profile_data || p_fields,
    display_name=case when p_display_name is null then display_name else nullif(trim(p_display_name),'') end
  where user_id=p_user_id returning *;
$$;
revoke all on function public.update_member_profile_fields(uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.update_member_profile_fields(uuid,jsonb,text) to service_role;

-- Serialize saves for the same game and commit its scorecard as one unit.
create function public.save_tournament_result(
  p_tournament uuid, p_game uuid, p_winners uuid[], p_participants uuid[], p_note text, p_image text
) returns uuid language plpgsql security invoker set search_path='' as $$
declare play uuid;
begin
  insert into public.plays(tournament_id,game_id,played_at,played_note)
  values(p_tournament,p_game,now(),p_note)
  on conflict(tournament_id,game_id) do update set played_at=excluded.played_at,played_note=excluded.played_note
  returning id into play;
  delete from public.game_winners where play_id=play;
  insert into public.game_winners(play_id,player_id,win_image)
    select play, winner, p_image from unnest(p_winners) winner;
  delete from public.play_players where play_id=play;
  insert into public.play_players(play_id,player_id) select play, participant from unnest(p_participants) participant;
  -- Production's player_losses_by_tournament view derives totals from the saved winners and participants.
  return play;
end $$;
revoke all on function public.save_tournament_result(uuid,uuid,uuid[],uuid[],text,text) from public,anon,authenticated;
grant execute on function public.save_tournament_result(uuid,uuid,uuid[],uuid[],text,text) to service_role;

-- Reject an invitation addressed to an account that already has a different roster place.
-- Only identical, still-pending invitations can be resent.
create function public.prepare_player_invitation(p_player uuid, p_email text) returns void
language plpgsql security definer set search_path='' as $$
declare account_id uuid;
begin
  p_email := lower(trim(p_email));
  select id into account_id from auth.users where lower(email)=p_email for update;
  if exists(select 1 from public.player_memberships where user_id=account_id) then
    raise exception 'This account already has a roster membership.' using errcode='23505';
  end if;
  if not exists(select 1 from public.players where id=p_player and is_active) then
    raise exception 'Choose an active player.' using errcode='22023';
  end if;
  insert into public.player_memberships(player_id, invited_email) values(p_player,p_email)
  on conflict(player_id) do nothing;
  if not exists(select 1 from public.player_memberships where player_id=p_player
    and user_id is null and invited_email=p_email and is_active) then
    raise exception 'This player already has a different invitation or membership.' using errcode='23505';
  end if;
end $$;
revoke all on function public.prepare_player_invitation(uuid,text) from public,anon,authenticated;
grant execute on function public.prepare_player_invitation(uuid,text) to service_role;

do $$
declare archive regclass;
begin
  foreach archive in array array[to_regclass('public.player_login_tokens'),to_regclass('public.player_login_token_redemptions')]
  loop
    if archive is not null then execute format('revoke all on %s from public,anon,authenticated',archive); end if;
  end loop;
end $$;
