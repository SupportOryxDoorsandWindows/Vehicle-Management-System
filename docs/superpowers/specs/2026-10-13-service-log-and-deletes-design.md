# Service & Mileage Log, and Deleting Records — Design

**Date:** 2026-10-13
**Owner:** Business Support (Oryx Doors & Windows)
**Status:** Approved for implementation (requested by owner after Phase 2)

## 1. Service & mileage log

### Summary
Admins record each service, repair or plain odometer reading for a vehicle,
instead of the single "last service mileage" figure imported from the
spreadsheet. The Maintenance tab shows the vehicle's current odometer, its
last service and when the next one is due.

### Scope
- **Maintenance tab** (everyone):
  - Summary: Current odometer (latest reading of any record), Last service
    (date and KM of the latest "Service" record), Next service (date and/or
    KM, with an Overdue / Due Soon badge).
  - Before anything is logged, Last service falls back to the imported
    `last_service_mileage_km`, labelled "from the original spreadsheet".
  - **Service & mileage log** table, newest first: Date, Type, Odometer,
    Garage, Description, Next service. Export to Excel.
  - **Maintenance & repair expenses** table below, as today, minus its old
    Mileage column (it repeated the vehicle's single imported figure on every
    row, which looked like per-expense data).
- **Add / edit a record** (Admins): `/vehicles/:id/maintenance/new` and
  `/vehicles/:id/maintenance/:recordId/edit`, inside the vehicle profile so
  the Maintenance tab stays selected. Fields: Date (required, defaults to
  today), Type (required: Service, Repair, Tyres, Battery, Inspection,
  Odometer reading only, Other), Odometer KM (required for "Odometer reading
  only"), Garage, Description, Next service date, Next service KM. Delete
  from the edit page.
- **Due rules:** by date, the same "Expiring Soon" days setting as documents;
  by KM, Due Soon within 1,000 KM and Overdue once the current odometer
  reaches it. The worse of the two wins. The next service comes from the
  latest record (by date) that sets a next service date or KM, so a later
  repair or reading doesn't hide it.
- **Dashboard:** a "Services Due" tile counting active vehicles whose next
  service is Overdue or Due Soon ("Not Available" if the log fails to load;
  the rest of the dashboard still shows).
- Costs stay in Expenses: a service record has no cost field, so nothing is
  counted twice.

### Data model (migration `0010`)
`service_records`: `vehicle_id` (not null, deleted with the vehicle),
`record_date` (not null), `kind` (checked list), `odometer_km` (≥ 0, required
when kind is `reading`), `garage`, `description`, `next_service_date`,
`next_service_km` (≥ 0), `created_by`, `created_at`. A trigger sets
`created_by`/`created_at` on insert and keeps them on update. RLS: read for
active users, write for admins (same as vehicles).

## 2. Deleting vehicles, expenses and service records

### Summary
Admins can delete a record entered by mistake. Today only "set the vehicle
Inactive" exists. Every deletion is logged with a full copy of the row, so
nothing deleted is lost for good (the owner has already had one vehicle
deleted by mistake, in the spreadsheet era).

### Scope
- **Delete vehicle** on Edit Vehicle; **Delete expense** on Edit Expense;
  **Delete record** on the service record form. Each asks for confirmation
  in place ("Yes, delete" / "Cancel") and says what goes with it.
- A vehicle that has **expenses or assignment history can't be deleted**:
  the database refuses, and the page says to set its Status to Inactive
  instead (or move its expenses first). Its service records and uploaded
  documents are deleted with it.
- An expense's attachments are deleted with it. Its assignment history
  stays, shown as "Deleted expense" on the History page.
- Uploaded files are not removed from storage: they stay, unreachable from
  the app, under the deleted record's folder (`vehicles/<id>/…`,
  `expenses/<id>/…`), so a mistaken delete can be fully restored.
- **History page** gains a "Deleted records" section (latest 500): when,
  what (vehicle plate, expense name and amount, or service record), and who.
  Included in the History export as a second sheet. Restoring is done on
  request from the logged copy; there is no restore button.

### Data model
- `deleted_records` (migration `0010`): `table_name`, `record_id`, `record`
  (jsonb copy of the row), `deleted_by` (`auth.uid()`), `deleted_at`.
  Written only by a `security definer` trigger after delete on vehicles,
  expenses and service records (cascaded deletes included). RLS: admins
  read; no one inserts, edits or deletes through the API.
- Foreign keys (migration `0011`, kept separate because it drops and
  re-adds constraints):
  - `documents.vehicle_id`, `documents.expense_id`: `on delete cascade`.
  - `expense_assignment_audit.expense_id`: nullable, `on delete set null`.
  - Vehicle references (expenses, assignment history) stay restrictive:
    that is what blocks deleting a vehicle with history.
- RLS already lets admins delete vehicles and expenses ("Admins write …"
  policies are `for all`); Viewers can't.

## Testing Approach
- Unit: due rules (date, KM, worse-of-both, plain readings ignored for the
  next service, fallback to the imported mileage).
- Component: Maintenance summary and log; Admin sees Add/Edit, Viewer
  doesn't; record form validation (date, type, odometer for readings) and
  save; delete confirm, success navigation, and the "has expenses" message;
  History "Deleted records"; Dashboard "Services Due".
- Database (local Postgres): admin writes service records, Viewer and
  anonymous can't; created_by can't be forged; reading without odometer is
  rejected; deleting a vehicle cascades its service records and documents
  and logs each row; a vehicle with expenses or history can't be deleted;
  deleting an expense keeps its history with a null expense; deleted
  records are readable by admins only and can't be written through the API.

## Explicitly Out of Scope
A restore button, linking a service record to an expense, odometer sanity
warnings, email reminders for services, deleting uploaded files from storage.
