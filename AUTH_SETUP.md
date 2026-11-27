# Player memberships

Members sign in with Google, a Supabase email link, or an existing email and password. An email link lets a member set a password on their account profile. The Supabase Auth user ID identifies the account after the first verified sign-in.

## Admin workflow

1. Open **Admin → Members** and choose an active roster player.
2. Enter their login email and send the invitation. Resend or cancel pending invitations on the same page.
3. The player opens the email link or signs in with Google using the same verified address. The database checks the sign-in method and address before linking the roster place. Once linked, they can also use a password. Later email changes preserve ownership.
4. The Members table shows the account email, linked player, providers, last sign-in, status and role. Disable a membership to suspend its access, including existing sessions. A roster player can remain without an account.

Members manage their personal profile and their own posts and can propose rules. Admins moderate posts and rules, manage the roster and catalog, record official results, and manage memberships. An initial admin can manage the site before claiming a roster place. To post as a player they also need a linked active roster place. Admin authority comes from Supabase Auth's server-managed app metadata.

## Deployment

Test the player memberships migration and the matching app together on a local Supabase instance or an isolated staging project. The production project reference is `mtywyenrzdkvypvvacjz`. The migration expects the existing players, login approvals, profiles, posts and tournament schema. It preserves pending invitations and existing account links, and leaves unmatched historical post attribution intact. Older migrations in this repository differ from the live schema. Reconcile migration history before a production rollout. Coordinate the migration and application release because the legacy login functions lose execute permission.

Enable Google and Email in Supabase Auth and turn on **Confirm Email** for new signups. This app uses email for one-time links and Google for social sign-in. If signups previously used automatic confirmation, review existing password accounts and verify their owners before inviting those addresses. An old password can still sign in after its account is linked. Configure email delivery for invitation and recovery links.

Google returns the user to the Supabase provider callback, `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase then sends the user back to the app that started sign-in. If you add hosted staging, set the staging app's **Site URL** in its own Supabase project. Under **Redirect URLs**, allow the staging hostname and the callback including its return path, for example `https://<staging-host>/auth/callback?next=**`. Copy the hostname from Vercel, including the full `.vercel.app` suffix when using a Vercel alias. Set the Vercel Preview environment variables to that staging Supabase project and redeploy.

For a local check, point the app at a local Supabase instance. Use the same browser origin in the local **Site URL** and callback allowlist, including the port. An invitation from the local test inbox exercises sign-in, player linking and posting. Testing Google's consent screen also requires a Google OAuth client configured for the local Supabase provider callback.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. If using `SUPABASE_URL`, it must identify the same project. Set `NEXT_PUBLIC_SITE_URL` to the canonical app origin to pin invitation links to that deployment. Bootstrap the first admin by setting `app_metadata.role` to `admin` through a trusted Supabase administrator. Subsequent role changes are available on the Members page.
