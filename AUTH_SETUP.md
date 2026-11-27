# Player memberships

Players sign in with the Google account an admin approved for their roster place. Linked members can also sign in with a password they set on their account profile. The Supabase Auth user ID identifies the account after the first verified sign-in.

## Admin workflow

1. Open **Admin → Members** and choose an active roster player.
2. Enter their Google account email and select **Approve email**. Share the ordinary player sign-in link (`/auth/login`) yourself. You can remove an unused approval if the address changes.
3. The player selects **Continue with Google** using the approved address. The database checks the sign-in method and address before linking the roster place. Once linked, they can also use a password. Later email changes preserve ownership.
4. The Members table shows the account email, linked player, providers, last sign-in, status and role. Disable a membership to suspend its access, including existing sessions. A roster player can remain without an account.

Members manage their personal profile and their own posts and can propose rules. Admins moderate posts and rules, manage the roster and catalog, record official results, and manage memberships. An initial admin can manage the site before claiming a roster place. To post as a player they also need a linked active roster place. Admin authority comes from Supabase Auth's server-managed app metadata.

## Deployment

Test the player memberships migration and the matching app together on a local Supabase instance or an isolated staging project. The production project reference is `mtywyenrzdkvypvvacjz`. The migration expects the existing players, login approvals, profiles, posts and tournament schema. It preserves pending invitations and existing account links, and leaves unmatched historical post attribution intact. Older migrations in this repository differ from the live schema. Reconcile migration history before a production rollout. Coordinate the migration and application release because the legacy login functions lose execute permission.

Enable Google and Email in Supabase Auth and turn on **Confirm Email** for new signups. Google verifies the address during OAuth. Player approvals and sign-in work without SMTP. If signups previously used automatic confirmation, review existing password accounts and verify their owners before approving those addresses. An old password can still sign in after its account is linked. A linked Google user who forgets their app password can sign in with Google and set a new password on their profile.

Google returns the user to the Supabase provider callback, `https://<project-ref>.supabase.co/auth/v1/callback`. Supabase then sends the user back to the app that started sign-in. If you add hosted staging, set the staging app's **Site URL** in its own Supabase project. Under **Redirect URLs**, allow the staging hostname and the callback including its return path, for example `https://<staging-host>/auth/callback?next=**`. Copy the hostname from Vercel, including the full `.vercel.app` suffix when using a Vercel alias. Set the Vercel Preview environment variables to that staging Supabase project and redeploy.

For a local check, point the app at a local Supabase instance. Use the same browser origin in the local **Site URL** and callback allowlist, including the port. Approve a test Google email in Admin → Members. To test the consent screen and first sign-in end to end, configure a Google OAuth client for the local Supabase provider callback.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and the server-only `SUPABASE_SERVICE_ROLE_KEY`. If using `SUPABASE_URL`, it must identify the same project. Bootstrap the first admin by setting `app_metadata.role` to `admin` through a trusted Supabase administrator. Subsequent role changes are available on the Members page.
