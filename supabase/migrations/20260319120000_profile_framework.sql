alter table public.user_profiles
  drop constraint if exists user_profiles_role_check;

update public.user_profiles
set role = 'standard'
where role = 'member';

alter table public.user_profiles
  add constraint user_profiles_role_check check (role in ('admin', 'standard'));

alter table public.user_profiles
  add column if not exists player_id uuid references public.players (id) on delete set null,
  add column if not exists profile_data jsonb not null default '{}'::jsonb;

create index if not exists user_profiles_player_id_idx on public.user_profiles (player_id);

create or replace function public.sync_user_profile_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  next_display_name text;
  next_role text;
begin
  next_display_name := coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'name');
  next_role := case
    when coalesce(new.raw_app_meta_data ->> 'role', new.raw_user_meta_data ->> 'role', 'standard') = 'admin' then 'admin'
    else 'standard'
  end;

  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    role,
    is_active,
    created_at,
    updated_at,
    last_sign_in_at,
    player_id,
    profile_data
  )
  values (
    new.id,
    new.email,
    next_display_name,
    next_role,
    not coalesce(new.banned_until > now(), false),
    coalesce(new.created_at, now()),
    now(),
    new.last_sign_in_at,
    null,
    '{}'::jsonb
  )
  on conflict (user_id)
  do update set
    email = excluded.email,
    display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now(),
    last_sign_in_at = excluded.last_sign_in_at;

  return new;
end;
$$;

insert into public.user_profiles (
  user_id,
  email,
  display_name,
  role,
  is_active,
  created_at,
  updated_at,
  last_sign_in_at,
  player_id,
  profile_data
)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'name') as display_name,
  case
    when coalesce(u.raw_app_meta_data ->> 'role', u.raw_user_meta_data ->> 'role', 'standard') = 'admin' then 'admin'
    else 'standard'
  end as role,
  not coalesce(u.banned_until > now(), false) as is_active,
  coalesce(u.created_at, now()) as created_at,
  now() as updated_at,
  u.last_sign_in_at,
  null as player_id,
  '{}'::jsonb as profile_data
from auth.users u
on conflict (user_id)
do update set
  email = excluded.email,
  display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now(),
  last_sign_in_at = excluded.last_sign_in_at,
  profile_data = coalesce(public.user_profiles.profile_data, excluded.profile_data);

drop policy if exists "admins can view all user profiles" on public.user_profiles;
create policy "admins can view all user profiles"
on public.user_profiles
for select
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', 'standard') = 'admin');
