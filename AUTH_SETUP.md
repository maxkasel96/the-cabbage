# Player memberships

Members sign in with Google, a Supabase email link, or an existing email and password. An email link lets a member set a password on their account profile. The Supabase Auth user ID identifies the account after the first verified sign-in.

## Admin workflow

1. Open **Admin → Members** and choose an active roster player.
2. Enter their login email and send the invitation. Resend or cancel pending invitations on the same page.
3. The player opens the email link or signs in with their invited, verified email. Acceptance claims the roster place once. Later email changes preserve ownership.
4. The Members table shows the account email, linked player, providers, last sign-in, status and role. Disable a membership to suspend its access, including existing sessions. A roster player can remain without an account.

Members manage their personal profile and their own posts and can propose rules. Admins moderate posts and rules, manage the roster and catalog, record official results, and manage memberships. An initial admin can manage the site before claiming a roster place. To post as a player they also need a linked active roster place. Admin authority comes from Supabase Auth's server-managed app metadata.

## Deployment

Apply the player memberships migration to a staging copy of The Cabbage's database and deploy the matching application there first. The production project reference is `mtywyenrzdkvypvvacjz`. The migration expects the existing players, login approvals, profiles, posts and tournament schema. It preserves pending invitations and existing account links, and leaves unmatched historical post attribution intact. Older migrations in this repository differ from the live schema. Reconcile migration history before a production rollout. Coordinate the migration and application release because the legacy login functions lose execute permission.

Enable Google and Email in Supabase Auth. Configure Google with Supabase's provider callback URL. In Supabase Auth URL Configuration, set the site URL and allow the application's `/auth/callback` redirect for each deployed environment, including the profile return path. Configure email delivery for the invite and recovery links.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. If using `SUPABASE_URL`, it must identify the same project. Set `NEXT_PUBLIC_SITE_URL` to the canonical app origin to pin invitation links to that deployment. Bootstrap the first admin by setting `app_metadata.role` to `admin` through a trusted Supabase administrator. Subsequent role changes are available on the Members page.
