# Supabase Google OAuth + Admin Roles

This app now supports Google sign-in through Supabase, and enforces two roles:

- `member`
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
- `member`

If missing/invalid, app behavior treats users as non-admin.

## 4) Assigning roles

- Sign in with Google.
- Visit `/admin/users` as an admin.
- Change user role between `member` and `admin`.

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

After first admin exists, manage all roles from `/admin/users`.
