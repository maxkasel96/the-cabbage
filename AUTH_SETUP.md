# Supabase Google OAuth + Admin Roles

This app now supports Google sign-in through Supabase, and enforces two roles:

- `standard`
- `admin`

Only `admin` can access `/admin/*` pages and `/api/admin/*` routes.

## 1) Supabase: enable Google OAuth

In **Supabase Dashboard → Authentication → Providers → Google**:

1. Enable Google provider.
2. Add your Google OAuth client ID/secret.
3. Set redirect URL(s):
   - Local: `http://localhost:3000/auth/callback`
   - Production: `https://<your-domain>/auth/callback`

Also ensure your Google OAuth app has matching authorized redirect URIs.

## 2) Environment variables

Set these in `.env.local` and deployment secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (optional fallback for service-role client)
- `SUPABASE_SERVICE_ROLE_KEY` (required for role management API)

## 3) Role model

Role is read from `user.app_metadata.role` (fallback `user.user_metadata.role`).

Expected values:

- `admin`
- `standard`

Legacy `member` metadata is still normalized to `standard` in the app.

If missing/invalid, app behavior treats users as non-admin.

## 4) Assigning roles

- Sign in with Google.
- Visit `/admin/users` as an admin.
- Change user role between `standard` and `admin`.

Under the hood, this uses Supabase Admin API (`auth.admin.updateUserById`) to write:

```json
{
  "app_metadata": { "role": "admin" }
}
```

## 5) Access control behavior

- Unauthenticated access to admin routes → redirected to `/auth/login`.
- Authenticated non-admin access to admin routes → redirected to `/auth/unauthorized`.
- `/api/admin/*` returns JSON `401`/`403` instead of redirects.

## 6) First admin bootstrap

You need one initial admin account. Two options:

1. Use Supabase Dashboard user editor and set `app_metadata.role = "admin"`.
2. Use SQL editor with service tooling (or edge function) to update user metadata.

After first admin exists, manage all roles from `/admin/users`. Standard users can manage their own profile at `/account/profile`.

## 7) Public user profile framework

If you want a queryable `public` table for app-side user metadata (instead of reading only from
`auth.users` metadata), apply migration:

- `supabase/migrations/20260315103000_user_profiles.sql`

This creates `public.user_profiles` keyed by `auth.users.id`, with:

- `user_id` (PK/FK to `auth.users`)
- `email`
- `display_name`
- `role` (`standard`/`admin`)
- `player_id` (nullable future link to `public.players`)
- `profile_data` (generic JSON for future profile customizations)
- `is_active`
- `created_at`, `updated_at`, `last_sign_in_at`

It also adds:

- Trigger-based sync from `auth.users` on insert/update.
- Backfill for existing auth users.
- A framework page at `/account/profile` for authenticated users.
- Admin visibility of profile records from `/admin/users`.

This gives you the framework for future profile customization without locking you into specific user-editable fields yet.

## 8) Preview/local password sign-in

For local development and Vercel preview deployments, the login page supports
`signInWithPassword({ email, password })` in addition to Google OAuth.

Environment gating:

- Local dev: `NODE_ENV=development` enables password sign-in.
- Preview: `NEXT_PUBLIC_VERCEL_ENV=preview` enables password sign-in.
- Production: password sign-in is hidden; Google OAuth remains available.

Both auth paths now run the same approved-player claim flow before the app persists
its server session:

- Google OAuth prefers an exact `provider = google` + email match.
- Email/password sign-in can fall back to a unique approved email match when only one
  active player-login identity exists for that email.

This means admins can approve a player login from the app UI without needing to
manually set `user_profiles.player_id` in SQL after a user signs in.


## 9) Preview troubleshooting (RLS / DB-environment mismatch)

If preview sign-in works but pages like `/history` or `/player-cards` show no data, verify these in
**the same Supabase project your preview points to**.

### A) Verify seed data exists in that project

```sql
select count(*) as tournaments_count from public.tournaments;
select count(*) as players_count from public.players;
select count(*) as plays_count from public.plays;
select count(*) as game_winners_count from public.game_winners;
```

`/history` specifically requires an active tournament and played rows:

```sql
select id, label, is_active from public.tournaments where is_active = true;

select tournament_id, count(*) as played_rows
from public.plays
where played_at is not null
group by tournament_id
order by played_rows desc;
```

### B) Check whether RLS is enabled on key tables

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'tournaments',
    'players',
    'plays',
    'play_players',
    'game_winners',
    'games'
  )
order by tablename;
```

### C) Check whether SELECT policies exist

```sql
select schemaname, tablename, policyname, roles, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename in (
    'tournaments',
    'players',
    'plays',
    'play_players',
    'game_winners',
    'games'
  )
  and cmd = 'SELECT'
order by tablename, policyname;
```

If RLS is enabled and no matching select policies exist, data reads will return empty/forbidden in
preview.

### D) Minimal read policies (authenticated users)

If your intent is that signed-in users can read these datasets, add read policies like:

```sql
create policy "authenticated can read tournaments" on public.tournaments
for select to authenticated using (true);

create policy "authenticated can read players" on public.players
for select to authenticated using (true);

create policy "authenticated can read plays" on public.plays
for select to authenticated using (true);

create policy "authenticated can read play_players" on public.play_players
for select to authenticated using (true);

create policy "authenticated can read game_winners" on public.game_winners
for select to authenticated using (true);

create policy "authenticated can read games" on public.games
for select to authenticated using (true);
```

If the pages should be public without sign-in, use `to anon, authenticated` instead.

### E) Verify preview points at the intended Supabase project

Double-check Vercel preview env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

A common issue is preview envs pointing to a different (empty) Supabase project than local.

## 10) Manual player-login tokens

If you need to manually link an authenticated Supabase user to an existing `player_login_identities`
row, apply migration:

- `supabase/migrations/20260320110000_player_login_tokens.sql`

That migration adds:

- `public.user_profiles.player_id` when it does not already exist, because that is the durable link from an auth user profile to a player row.
- `public.player_login_tokens` for one-time or limited-use login-link tokens.
- `public.player_login_token_redemptions` for an audit trail of who redeemed each token.
- `public.issue_player_login_token(...)` to generate a token for an existing player-login identity.
- `public.redeem_player_login_token(...)` to link the authenticated user to the identity and set `user_profiles.player_id`.

This means your existing `public.user_profiles` table absolutely factors into this workflow: the token tables handle issuance/redemption, and `user_profiles.player_id` is where the user-to-player association is persisted after redemption.
The migration also detects whether your `user_profiles.role` check constraint uses `member` or `standard`, so the redemption function stays compatible with either role model.

### Issue a token for an existing player login identity

```sql
select *
from public.issue_player_login_token(
  p_player_login_identity_id := '1ae49478-7ae1-4be2-b3fd-1ddf4ebff6ee',
  p_expires_at := now() + interval '7 days',
  p_note := 'Manual invite for Claire',
  p_max_redemptions := 1
);
```

Save the returned `token` value immediately. Only the hash is stored in the database.

### Redeem a token after the user is authenticated

```sql
select *
from public.redeem_player_login_token(
  p_token := '<paste-token-here>',
  p_auth_user_id := '<auth.users.id>'
);
```

On success, the function:

1. Links `player_login_identities.auth_user_id` to the provided auth user.
2. Upserts `public.user_profiles` for that auth user.
3. Sets `user_profiles.player_id` to the linked player.
4. Records the redemption in `public.player_login_token_redemptions`.
