# Audit History & Reminder Settings — Phase 2 (Sub-projects 5 & 6) Design

**Date:** 2026-10-13
**Owner:** Business Support (Oryx Doors & Windows)
**Status:** Approved for implementation (the last two Phase 2 items)

## 5. Assignment History page

### Summary
An admin page listing every change of an expense's vehicle that the
database has recorded since sub-project 2: when, which expense, from which
vehicle to which, and who did it.

### Scope
- Route `/history`, nav link "History", **Admins only**.
  - Why admin-only: the table itself is readable by every active user, but
    "who did it" is an email from `profiles`, which only admins may read.
    A Viewer would see "Unknown user" on every row.
- Columns: When, Expense (links to Edit Expense), Amount, From, To (plates
  linking to the vehicle; "Not assigned" when empty), By (email; "System"
  for changes made outside the app).
- Filter by vehicle (matches either From or To). Newest first, latest 500
  rows (the page says so if the limit is reached).
- Export to Excel, reusing sub-project 4.
- No database changes: the table, trigger and read policy already exist.

## 6. Reminder settings

### Summary
Admins choose how many days before expiry a document counts as
"Expiring Soon" (fixed at 30 today). It drives the Documents tab badges and
the Dashboard's Upcoming Renewals and Expired Documents tiles.

### Scope
- Route `/settings`, nav link "Settings", **Admins only**: one number field
  (1–365 days), Save, and who last changed it and when.
- Everyone's pages use the saved value. Until it loads (or if loading
  fails), the old default of 30 applies, so pages never block on it.

### Data model (migration `0007`)
- `app_settings`: a single row (`id boolean primary key default true check
  (id)`), `expiring_soon_days int not null default 30 check (between 1 and
  365)`, `updated_by uuid`, `updated_at timestamptz`.
- A trigger fills `updated_by = auth.uid()` and `updated_at = now()` on
  every update, so the "last changed by" can't be faked.
- RLS: read for active users, update for admins, no insert or delete (the
  single row is created by the migration).

## Testing Approach
- History: rows render with plates, emails, "System", "Not assigned"; the
  vehicle filter; the 500-row notice; export; Viewers are redirected.
- Settings: validation (1–365, whole numbers); save calls the API and
  refreshes the value app-wide; a save failure shows a message; badges and
  Dashboard tiles use the configured threshold; default 30 while loading.
- Database (local Postgres): admin can update, Viewer can't; values outside
  1–365 are rejected; no second row can be inserted; updated_by/at are set
  by the trigger even if the client sends other values.

## Explicitly Out of Scope
Email or push reminders, per-document-type thresholds, history of uploads
or vehicle edits (not recorded today).
