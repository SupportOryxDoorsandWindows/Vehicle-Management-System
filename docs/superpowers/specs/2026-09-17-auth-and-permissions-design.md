# Auth & Permissions — Phase 2 (Sub-project 1) Design

**Date:** 2026-09-17
**Owner:** Business Support (Oryx Doors & Windows)
**Status:** Approved for implementation planning

## Summary

The first Phase 2 sub-project. Adds login-gated access and two roles
(Admin / Viewer) to the Vehicle Management System, backed by database
rules — not just a UI login screen — so data is actually protected
regardless of how the app is hosted. Unblocks every later Phase 2
sub-project (editing, uploads, audit trail all need "who did this").

## Why This Is First

The app is currently hosted on public GitHub Pages with a public
Supabase anon key and fully open read policies — anyone with the URL,
or anyone who inspects the network traffic, can read all fleet and
expense data with no login. This sub-project closes that gap.

## Roles

Two roles, no department scoping (deferred — not requested):

- **Admin** — full access: browse, edit vehicles/expenses (once the
  Editing sub-project ships), manage other users' accounts and roles.
- **Viewer** — read-only: can browse everything Admins can see today
  (Dashboard, Vehicles, profiles, Unassigned Expenses, Reports), but
  every mutating action is hidden or disabled.

Roles are assigned per-user, stored server-side, and enforced in the
database — never trusted from client state alone.

## Data Model Changes

### `profiles`
One row per authenticated user, keyed to Supabase Auth:
- `id` (uuid, references `auth.users.id`, primary key)
- `email` (text, denormalized for easy display in Manage Users)
- `role` (`admin` | `viewer`, not null)
- `active` (boolean, default `true` — deactivated users keep their
  history/audit trail but can no longer log in or are denied at the
  RLS layer)
- `created_at`, `updated_at`

### RLS policy changes (all existing tables)
Every table's policies change from "public, unauthenticated SELECT"
to:
- **SELECT:** any row where the caller has a matching active `profiles`
  row (i.e., any logged-in, active user — both roles can read).
- **INSERT/UPDATE/DELETE:** only where the caller's `profiles.role =
  'admin'` (mutations don't exist yet in the app today, but the policy
  is written now so it's correct when the Editing sub-project lands).

`profiles` itself: a user can read their own row; only admins can
read/write all rows (needed for the Manage Users page).

## Auth Flows

### Login
Supabase Auth email + password. A login page is the only reachable
route for an unauthenticated visitor — every other route redirects to
it. Session persists via Supabase's standard client-side session
storage; no custom token handling.

### Invite / account creation (admin-only)
No public sign-up. An Admin uses the in-app **Manage Users** page to
invite a new staff member by email + role. This calls a new Supabase
**Edge Function** (`invite-user`), because creating a user account
requires Supabase's admin API, which needs the *service role* key — a
privileged key that must never be shipped to the browser (Phase 1
deliberately used only the public anon key; this is the first piece
that needs a server-side secret).

Flow: Admin submits email + role in the UI → app calls `invite-user`
Edge Function with the admin's session token → function verifies the
caller is an active admin (re-checked server-side, not trusted from
the client) → function uses the service role key to create the auth
user, send Supabase's built-in invite email (sets their own password
via a link), and insert the matching `profiles` row.

### Password reset
Standard Supabase "forgot password" email flow — no custom building
needed.

### Role change / deactivation (admin-only)
Manage Users page lets an Admin change a user's role or set
`active = false` directly (a normal authenticated table update, RLS
already restricts this to admins — no Edge Function needed for this
part).

## Manage Users Page

Admin-only route (`/users` or similar, hidden from Viewers in nav and
blocked by RLS if accessed directly):
- Table of all users: email, role, active/inactive, created date.
- "Invite user" form: email + role.
- Per-row actions: change role, deactivate/reactivate.
- No delete — deactivation preserves audit history integrity for later
  sub-projects.

## UI/Route Gating

- App-wide auth check wraps the router: unauthenticated → login page
  only. Authenticated → normal app.
- Viewer-only session: any Edit/Assign/Manage Users control is not
  rendered at all (not just disabled), so the UI doesn't imply access
  that RLS would reject anyway.
- This is defense in depth, not the actual security boundary — RLS is
  the boundary. The UI gating exists for a clean Viewer experience,
  not as the thing preventing unauthorized access.

## Testing Approach

- Component tests: route gating (unauthenticated redirect, Viewer sees
  no mutating controls), Manage Users form validation.
- Integration tests (live Supabase, existing `test:integration`
  pattern): RLS policies actually reject a Viewer's write attempt and
  an unauthenticated read — asserting the database, not just the UI,
  enforces this.
- Edge Function: tested via a real invocation against a disposable
  test user in the integration suite (created and cleaned up per run).

## Rollout

RLS policy changes and the login wall ship together in one deploy —
there's no safe "in-between" state where the UI is gated but the
database isn't, since that would still leave data readable to anyone
calling Supabase directly. The brief window between merging this and
it going live carries the same exposure the app already has today, so
there's no new risk introduced by the rollout itself.

After this ships, the maintainer (you) will need to invite the first
Admin account manually (e.g., via the Supabase dashboard, one-time),
since the in-app Manage Users page requires an existing Admin to
invite anyone.

## Explicitly Out of Scope for This Sub-project

Department-scoped access, SSO/Microsoft login, self-service sign-up,
editing vehicles/expenses (separate sub-project — this only adds the
permission *rules* for it), document upload permissions (separate
sub-project), audit history UI (separate sub-project, though this
sub-project's Edge Function calls and role changes are exactly the
kind of event that sub-project would surface).
