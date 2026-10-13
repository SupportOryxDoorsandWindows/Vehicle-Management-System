# Document & Photo Uploads — Phase 2 (Sub-project 3) Design

**Date:** 2026-10-13
**Owner:** Business Support (Oryx Doors & Windows)
**Status:** Approved for implementation (chosen by owner as next sub-project)

## Summary

Admins upload the real files behind each vehicle and expense: Mulkiya,
vehicle licence, CID and advertisement permits, vehicle photos, quotations,
invoices and other attachments. Everyone logged in can open them. A vehicle's
latest uploaded photo replaces the representative stock image on its profile.

## Why This Is Next

The imported data only has file *names* from the previous system: all 52
vehicles list a Mulkiya and photo/document names, and 46 expenses list
quotation or other attachment names. The files themselves were never
migrated, so nobody can open a registration card or invoice from the app.

## Scope

### Where files appear
- **Documents tab:** one row per document type (Vehicle License, CID Permit,
  Advertisement Permit, Mulkiya), as today, plus the uploaded files for that
  type. Below the table: a **Photos** section (thumbnails) and **Other
  documents**.
- **Vehicle header:** the most recent photo, if any, instead of the
  representative image (whose "Representative image" caption then goes).
- **Vehicle Expenses tab:** a Files column linking each expense's
  attachments.
- **Edit Expense page:** an Attachments section (quotation, invoice, other).
  New expenses must be saved before files can be attached.

### Who can do what
- Admins upload and remove files. Viewers see links only. Same gating rule as
  before: no controls rendered for Viewers, and the database rejects them
  anyway.

### Files
- Allowed: PDF, JPEG, PNG, WebP. Maximum 10 MB per file. Checked in the
  browser for a friendly message, and enforced by the storage bucket.
- Original file names are kept for display. Storage paths are generated
  (`vehicles/<id>/<kind>/<uuid>-<safe name>`), so two files with the same
  name never overwrite each other.
- Opening a file uses a short-lived signed link (1 hour): the bucket is
  private, so a copied link stops working and logged-out visitors get
  nothing.
- No editing a file in place: remove and upload again.

### Legacy file names
The spreadsheet names stay visible, labelled "Listed in the original
spreadsheet (file not uploaded)", so Admins can see which files to find and
upload. They are not changed or deleted.

## Data Model (migration `0006`)

- Private Storage bucket `vehicle-documents` with the size and type limits
  above.
- Storage policies on that bucket: read for any active user
  (`current_user_role() is not null`), upload and delete for admins.
- Table `documents` (one row per uploaded file): `vehicle_id` *or*
  `expense_id` (exactly one), `kind`, `storage_path` (unique), `file_name`,
  `content_type`, `size_bytes`, `uploaded_by` (defaults to the caller, must
  be the caller), `uploaded_at`.
  - `kind` is an enum; a check keeps vehicle kinds on vehicles and expense
    kinds (quotation, invoice, other) on expenses.
  - RLS: read for active users; insert and delete for admins; no update.
- Why a table and not just listing the bucket: one query fetches every
  attachment for a vehicle's expenses, and it records who uploaded what.

## Consistency

Upload stores the file, then inserts its row. If the insert fails, the file
is removed again. Removal deletes the row first, then the file: if the file
removal fails, an invisible orphan file is left, never a broken link.

## Testing Approach

- Unit/component: path generation and name sanitising; type/size
  validation; upload rolls back the file when the row insert fails; removal
  order; Documents tab and Expenses tab render links; Viewer sees no upload
  or remove controls; header uses the latest photo and falls back to the
  representative image.
- Database (`supabase/tests/`, local Postgres with stubs): admin can insert
  and delete document rows; Viewer and anonymous cannot; uploaded_by can't
  be forged; kind/owner check rejects mismatches; storage policies allow
  admin writes, active-user reads, nothing for anonymous.

## Explicitly Out of Scope

Migrating the old files (they aren't available), thumbnails on vehicle
cards in lists, image resizing, virus scanning, versioning, bulk upload.
