create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'member' check (role in ('admin', 'member')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);

create index if not exists user_profiles_role_idx on public.user_profiles (role);
create index if not exists user_profiles_created_at_idx on public.user_profiles (created_at desc);

create or replace function public.set_user_profiles_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_profiles_set_updated_at on public.user_profiles;
create trigger user_profiles_set_updated_at
before update on public.user_profiles
for each row
execute function public.set_user_profiles_updated_at();

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
    when coalesce(new.raw_app_meta_data ->> 'role', new.raw_user_meta_data ->> 'role', 'member') = 'admin' then 'admin'
    else 'member'
  end;

  insert into public.user_profiles (user_id, email, display_name, role, is_active, created_at, updated_at, last_sign_in_at)
  values (new.id, new.email, next_display_name, next_role, not coalesce(new.banned_until > now(), false), coalesce(new.created_at, now()), now(), new.last_sign_in_at)
  on conflict (user_id)
  do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    is_active = excluded.is_active,
    updated_at = now(),
    last_sign_in_at = excluded.last_sign_in_at;

  return new;
end;
$$;

drop trigger if exists on_auth_user_changed_sync_profile on auth.users;
create trigger on_auth_user_changed_sync_profile
after insert or update on auth.users
for each row
execute function public.sync_user_profile_from_auth_user();

insert into public.user_profiles (user_id, email, display_name, role, is_active, created_at, updated_at, last_sign_in_at)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'name') as display_name,
  case
    when coalesce(u.raw_app_meta_data ->> 'role', u.raw_user_meta_data ->> 'role', 'member') = 'admin' then 'admin'
    else 'member'
  end as role,
  not coalesce(u.banned_until > now(), false) as is_active,
  coalesce(u.created_at, now()) as created_at,
  now() as updated_at,
  u.last_sign_in_at
from auth.users u
on conflict (user_id)
do update set
  email = excluded.email,
  display_name = excluded.display_name,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now(),
  last_sign_in_at = excluded.last_sign_in_at;

alter table public.user_profiles enable row level security;

create policy "users can view own profile"
on public.user_profiles
for select
using (auth.uid() = user_id);

create policy "admins can view all user profiles"
on public.user_profiles
for select
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', 'member') = 'admin');

create policy "admins can update all user profiles"
on public.user_profiles
for update
using (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', 'member') = 'admin')
with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'role', auth.jwt() -> 'user_metadata' ->> 'role', 'member') = 'admin');

create policy "service role can manage user profiles"
on public.user_profiles
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
