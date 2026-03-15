-- Adds role helpers for Supabase auth users.
-- Roles are stored in auth.users.app_metadata.role and constrained to admin/member.

create or replace function public.user_role_from_metadata(user_row auth.users)
returns text
language sql
stable
as $$
  select coalesce(user_row.raw_app_meta_data ->> 'role', user_row.raw_user_meta_data ->> 'role', 'member')
$$;

create or replace function public.is_admin(user_row auth.users)
returns boolean
language sql
stable
as $$
  select public.user_role_from_metadata(user_row) = 'admin'
$$;
