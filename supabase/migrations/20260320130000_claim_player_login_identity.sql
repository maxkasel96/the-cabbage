create or replace function public.claim_player_login_identity(
  p_auth_user_id uuid default auth.uid(),
  p_email text default null,
  p_provider text default null
)
returns table (
  player_login_identity_id uuid,
  player_id uuid,
  auth_user_id uuid,
  player_name text,
  matched_provider text,
  match_strategy text
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  auth_user_row record;
  identity_row record;
  normalized_email text;
  normalized_provider text;
  role_value text;
  display_name_value text;
  email_match_count integer := 0;
  now_value timestamptz := now();
begin
  if p_auth_user_id is null then
    raise exception 'auth user id is required.';
  end if;

  if auth.role() <> 'service_role' and auth.uid() is distinct from p_auth_user_id then
    raise exception 'Authenticated users can only claim player logins for themselves.';
  end if;

  select
    u.email,
    coalesce(u.raw_user_meta_data ->> 'display_name', u.raw_user_meta_data ->> 'name') as auth_display_name,
    case
      when coalesce(u.raw_app_meta_data ->> 'role', u.raw_user_meta_data ->> 'role', public.user_profiles_member_role()) = 'admin' then 'admin'
      else public.user_profiles_member_role()
    end as profile_role,
    not coalesce(u.banned_until > now_value, false) as auth_is_active,
    u.last_sign_in_at
  into auth_user_row
  from auth.users u
  where u.id = p_auth_user_id;

  if not found then
    raise exception 'auth user % was not found.', p_auth_user_id;
  end if;

  normalized_email := nullif(lower(trim(coalesce(p_email, auth_user_row.email))), '');
  normalized_provider := nullif(lower(trim(p_provider)), '');
  identity_row := null;

  if normalized_email is null then
    raise exception 'An email address is required to claim a player login.';
  end if;

  if normalized_provider is not null then
    select
      pli.id,
      pli.player_id,
      pli.provider,
      pli.auth_user_id as linked_auth_user_id,
      pli.is_active as identity_is_active,
      p.display_name as player_name,
      p.is_active as player_is_active,
      'provider_email'::text as match_strategy
    into identity_row
    from public.player_login_identities pli
    join public.players p on p.id = pli.player_id
    where pli.provider = normalized_provider
      and lower(trim(pli.email)) = normalized_email
    for update of pli;
  end if;

  if identity_row is null then
    select count(*)
    into email_match_count
    from public.player_login_identities pli
    where lower(trim(pli.email)) = normalized_email
      and pli.is_active = true;

    if email_match_count = 1 then
      select
        pli.id,
        pli.player_id,
        pli.provider,
        pli.auth_user_id as linked_auth_user_id,
        pli.is_active as identity_is_active,
        p.display_name as player_name,
        p.is_active as player_is_active,
        'email_only'::text as match_strategy
      into identity_row
      from public.player_login_identities pli
      join public.players p on p.id = pli.player_id
      where lower(trim(pli.email)) = normalized_email
        and pli.is_active = true
      for update of pli;
    elsif email_match_count > 1 then
      raise exception 'Multiple approved player logins matched this email. Contact an admin.';
    end if;
  end if;

  if identity_row is null then
    raise exception 'This email is not authorized for this app.';
  end if;

  if not identity_row.identity_is_active then
    raise exception 'The linked login identity is inactive.';
  end if;

  if not identity_row.player_is_active then
    raise exception 'The linked player profile is inactive.';
  end if;

  if identity_row.linked_auth_user_id is not null and identity_row.linked_auth_user_id <> p_auth_user_id then
    raise exception 'This player login is already linked to another auth user.';
  end if;

  role_value := auth_user_row.profile_role;
  display_name_value := auth_user_row.auth_display_name;

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
    normalized_email,
    display_name_value,
    role_value,
    auth_user_row.auth_is_active,
    identity_row.player_id,
    now_value,
    now_value,
    auth_user_row.last_sign_in_at
  )
  on conflict (user_id)
  do update set
    email = coalesce(excluded.email, public.user_profiles.email),
    display_name = coalesce(public.user_profiles.display_name, excluded.display_name),
    role = case when public.user_profiles.role = 'admin' then public.user_profiles.role else excluded.role end,
    is_active = excluded.is_active,
    player_id = excluded.player_id,
    updated_at = now_value,
    last_sign_in_at = coalesce(excluded.last_sign_in_at, public.user_profiles.last_sign_in_at);

  update public.player_login_identities
  set auth_user_id = p_auth_user_id,
      updated_at = now_value
  where id = identity_row.id;

  return query
  select
    identity_row.id,
    identity_row.player_id,
    p_auth_user_id,
    identity_row.player_name,
    identity_row.provider,
    identity_row.match_strategy;
end;
$$;
