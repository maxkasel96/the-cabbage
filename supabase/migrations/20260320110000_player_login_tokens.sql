alter table public.user_profiles
  add column if not exists player_id uuid references public.players (id) on delete set null;

create index if not exists user_profiles_player_id_idx
  on public.user_profiles (player_id);

create table if not exists public.player_login_tokens (
  id uuid primary key default gen_random_uuid(),
  player_login_identity_id uuid not null references public.player_login_identities (id) on delete cascade,
  token_hash text not null unique,
  token_preview text not null,
  note text,
  issued_by_user_id uuid references auth.users (id) on delete set null,
  expires_at timestamptz,
  max_redemptions integer not null default 1 check (max_redemptions > 0),
  redemption_count integer not null default 0 check (redemption_count >= 0 and redemption_count <= max_redemptions),
  last_redeemed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists player_login_tokens_identity_id_idx
  on public.player_login_tokens (player_login_identity_id);

create index if not exists player_login_tokens_active_lookup_idx
  on public.player_login_tokens (token_hash)
  where revoked_at is null;

create index if not exists player_login_tokens_expires_at_idx
  on public.player_login_tokens (expires_at)
  where expires_at is not null;

create table if not exists public.player_login_token_redemptions (
  id uuid primary key default gen_random_uuid(),
  player_login_token_id uuid not null references public.player_login_tokens (id) on delete cascade,
  player_login_identity_id uuid not null references public.player_login_identities (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists player_login_token_redemptions_token_idx
  on public.player_login_token_redemptions (player_login_token_id, redeemed_at desc);

create index if not exists player_login_token_redemptions_auth_user_idx
  on public.player_login_token_redemptions (auth_user_id, redeemed_at desc);

create or replace function public.set_player_login_tokens_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists player_login_tokens_set_updated_at on public.player_login_tokens;
create trigger player_login_tokens_set_updated_at
before update on public.player_login_tokens
for each row
execute function public.set_player_login_tokens_updated_at();

create or replace function public.user_profiles_member_role()
returns text
language plpgsql
stable
as $$
declare
  role_check text;
begin
  select pg_get_constraintdef(c.oid)
  into role_check
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'public'
    and t.relname = 'user_profiles'
    and c.conname = 'user_profiles_role_check';

  if role_check ilike '%standard%' then
    return 'standard';
  end if;

  return 'member';
end;
$$;

create or replace function public.issue_player_login_token(
  p_player_login_identity_id uuid,
  p_expires_at timestamptz default now() + interval '14 days',
  p_note text default null,
  p_max_redemptions integer default 1,
  p_issued_by_user_id uuid default auth.uid()
)
returns table (
  token_id uuid,
  player_login_identity_id uuid,
  player_id uuid,
  email text,
  token text,
  token_preview text,
  expires_at timestamptz,
  max_redemptions integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  identity_row public.player_login_identities%rowtype;
  raw_token text;
begin
  if auth.role() <> 'service_role'
    and coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', public.user_profiles_member_role()) <> 'admin' then
    raise exception 'Only admins can issue player login tokens.';
  end if;

  if p_max_redemptions is null or p_max_redemptions <= 0 then
    raise exception 'max redemptions must be greater than zero.';
  end if;

  select *
  into identity_row
  from public.player_login_identities
  where id = p_player_login_identity_id;

  if not found then
    raise exception 'Player login identity % was not found.', p_player_login_identity_id;
  end if;

  if not identity_row.is_active then
    raise exception 'Inactive player login identities cannot receive tokens.';
  end if;

  raw_token := concat(
    'plt_',
    replace(gen_random_uuid()::text, '-', ''),
    replace(gen_random_uuid()::text, '-', '')
  );

  return query
  insert into public.player_login_tokens (
    player_login_identity_id,
    token_hash,
    token_preview,
    note,
    issued_by_user_id,
    expires_at,
    max_redemptions
  )
  values (
    identity_row.id,
    md5(raw_token),
    left(raw_token, 16),
    nullif(trim(p_note), ''),
    p_issued_by_user_id,
    p_expires_at,
    p_max_redemptions
  )
  returning
    id,
    player_login_identity_id,
    identity_row.player_id,
    identity_row.email,
    raw_token,
    public.player_login_tokens.token_preview,
    public.player_login_tokens.expires_at,
    public.player_login_tokens.max_redemptions;
end;
$$;

create or replace function public.redeem_player_login_token(
  p_token text,
  p_auth_user_id uuid default auth.uid(),
  p_metadata jsonb default '{}'::jsonb
)
returns table (
  token_id uuid,
  player_login_identity_id uuid,
  player_id uuid,
  auth_user_id uuid,
  player_name text,
  redemption_count integer,
  redeemed_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  token_row record;
  role_value text;
  display_name_value text;
  now_value timestamptz := now();
begin
  if p_token is null or btrim(p_token) = '' then
    raise exception 'token is required.';
  end if;

  if p_auth_user_id is null then
    raise exception 'auth user id is required.';
  end if;

  if auth.role() <> 'service_role' and auth.uid() is distinct from p_auth_user_id then
    raise exception 'Authenticated users can only redeem tokens for themselves.';
  end if;

  select
    plt.id,
    plt.player_login_identity_id,
    pli.player_id,
    pli.auth_user_id as linked_auth_user_id,
    pli.is_active as identity_is_active,
    plt.max_redemptions,
    plt.redemption_count,
    p.display_name as player_name,
    p.is_active as player_is_active,
    u.email as auth_email,
    coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'name') as auth_display_name,
    case
      when coalesce(u.raw_app_meta_data ->> 'role', u.raw_user_meta_data ->> 'role', public.user_profiles_member_role()) = 'admin' then 'admin'
      else public.user_profiles_member_role()
    end as profile_role,
    u.last_sign_in_at
  into token_row
  from public.player_login_tokens plt
  join public.player_login_identities pli on pli.id = plt.player_login_identity_id
  join public.players p on p.id = pli.player_id
  join auth.users u on u.id = p_auth_user_id
  where plt.token_hash = md5(btrim(p_token))
    and plt.revoked_at is null
    and (plt.expires_at is null or plt.expires_at >= now_value)
  for update of plt, pli;

  if not found then
    raise exception 'Token is invalid, expired, or revoked.';
  end if;

  if not token_row.identity_is_active then
    raise exception 'The linked login identity is inactive.';
  end if;

  if not token_row.player_is_active then
    raise exception 'The linked player profile is inactive.';
  end if;

  if token_row.redemption_count >= token_row.max_redemptions then
    raise exception 'Token has already been fully redeemed.';
  end if;

  if token_row.linked_auth_user_id is not null and token_row.linked_auth_user_id <> p_auth_user_id then
    raise exception 'This login identity is already linked to another auth user.';
  end if;

  role_value := token_row.profile_role;
  display_name_value := token_row.auth_display_name;

  insert into public.user_profiles (
    user_id,
    email,
    display_name,
    role,
    is_active,
    player_id,
    created_at,
    updated_at,
    last_sign_in_at
  )
  values (
    p_auth_user_id,
    token_row.auth_email,
    display_name_value,
    role_value,
    true,
    token_row.player_id,
    now_value,
    now_value,
    token_row.last_sign_in_at
  )
  on conflict (user_id)
  do update set
    email = coalesce(excluded.email, public.user_profiles.email),
    display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
    role = case when public.user_profiles.role = 'admin' then public.user_profiles.role else excluded.role end,
    is_active = public.user_profiles.is_active,
    player_id = excluded.player_id,
    updated_at = now_value,
    last_sign_in_at = coalesce(excluded.last_sign_in_at, public.user_profiles.last_sign_in_at);

  update public.player_login_identities
  set auth_user_id = p_auth_user_id,
      updated_at = now_value
  where id = token_row.player_login_identity_id;

  update public.player_login_tokens
  set redemption_count = redemption_count + 1,
      last_redeemed_at = now_value,
      revoked_at = case when redemption_count + 1 >= max_redemptions then coalesce(revoked_at, now_value) else revoked_at end,
      updated_at = now_value
  where id = token_row.id;

  insert into public.player_login_token_redemptions (
    player_login_token_id,
    player_login_identity_id,
    player_id,
    auth_user_id,
    metadata
  )
  values (
    token_row.id,
    token_row.player_login_identity_id,
    token_row.player_id,
    p_auth_user_id,
    case when jsonb_typeof(p_metadata) = 'object' then p_metadata else '{}'::jsonb end
  );

  return query
  select
    plt.id,
    plt.player_login_identity_id,
    pli.player_id,
    p_auth_user_id,
    token_row.player_name,
    plt.redemption_count,
    plt.last_redeemed_at
  from public.player_login_tokens plt
  join public.player_login_identities pli on pli.id = plt.player_login_identity_id
  where plt.id = token_row.id;
end;
$$;

alter table public.player_login_tokens enable row level security;
alter table public.player_login_token_redemptions enable row level security;

drop policy if exists "admins can view player login tokens" on public.player_login_tokens;
create policy "admins can view player login tokens"
on public.player_login_tokens
for select
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', public.user_profiles_member_role()) = 'admin');

drop policy if exists "admins can manage player login tokens" on public.player_login_tokens;
create policy "admins can manage player login tokens"
on public.player_login_tokens
for all
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', public.user_profiles_member_role()) = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', public.user_profiles_member_role()) = 'admin');

drop policy if exists "service role can manage player login tokens" on public.player_login_tokens;
create policy "service role can manage player login tokens"
on public.player_login_tokens
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

drop policy if exists "admins can view player login token redemptions" on public.player_login_token_redemptions;
create policy "admins can view player login token redemptions"
on public.player_login_token_redemptions
for select
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', public.user_profiles_member_role()) = 'admin');

drop policy if exists "users can view their own token redemptions" on public.player_login_token_redemptions;
create policy "users can view their own token redemptions"
on public.player_login_token_redemptions
for select
using (auth.uid() = auth_user_id);

drop policy if exists "service role can manage player login token redemptions" on public.player_login_token_redemptions;
create policy "service role can manage player login token redemptions"
on public.player_login_token_redemptions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
