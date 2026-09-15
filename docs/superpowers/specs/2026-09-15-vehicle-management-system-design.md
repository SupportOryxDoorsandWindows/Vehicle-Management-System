# Vehicle Management & Cost Tracking System — Phase 1 Design

**Date:** 2026-09-15
**Owner:** Business Support (Oryx Doors & Windows)
**Status:** Approved for implementation planning

## Summary

Internal web app replacing manual cross-referencing of "Vehicle Report.xlsx" and
"All Expenses.xlsx". Users browse a fleet dashboard, drill into a per-vehicle
profile (Overview / Expenses / Maintenance / Documents / Finance / Reports),
and view fleet-wide reports. Phase 1 is read/browse-focused, seeded once from
the two source Excel files into a real database. Phase 2 (separate spec, not
built now) adds editing, uploads, auth/permissions, reminders config, and
export.

## Source Data (inspected directly, not assumed)

**Vehicle Report (1).xlsx**, sheet `Vehicle_Report`, 53 vehicle rows, 37
columns: Plate No, Vehicle License Expiry Date, Branded, CID Permit Expiry,
Advertisement Permit Expiry, Renewal Status, Purchase Condition, Owner,
Driver, Department, Tyre Size, Brand, Type of Car, Fuel Type, Seats, Chassis
No, Registration Date, Model, Vehicle Condition, Gear Type, Warranty
Year/KM, Free Service, Last Service Mileage (KM), Remarks, Upload Mulkiya,
Upload Photos/Documents, Start Date of Instalments, Instalment in Months,
Monthly Repayment, Flat Rate, End Date of Instalments, Instalment in Years,
Finance Amount, EMI Status, ID, CID Permit Start, Advertisement Permit
Start.

No purchase price or depreciation schedule exists anywhere in this file.

**All Expenses.xlsx**, sheet `All_Quartermaster_Expenses`, 54 rows, 22
columns: Supplier Name, Date, Job Status, Payment Terms, Type of Expense
(Service / Repair / New Purchase), Expense, Expense Description, Cost,
Quotation Number, Quotation (file), Invoice Number, Invoice (file), Vehicle
Number (If Applicable) — format `"PLATE - Driver Name"`, Oryx Employees,
Teams, Other Attachments, Requested By, Approved/Rejected By, Approval Date,
Paid By, Payment Date, Grouped Expense Reference.

31 of 54 rows carry a vehicle number; all 31 match cleanly to a Vehicle
Report plate after normalization (uppercase, collapse whitespace). The
remaining 23 rows are general Quartermaster spend (uniforms, tools, drill
bits) with no vehicle number — imported as Unassigned Expenses per Section
8/23 of the brief rather than dropped, since some could plausibly be
vehicle-related and mis-entered.

No standalone Fuel/Registration/Finance expense category exists — only free
-text `Type of Expense` + `Expense` fields (e.g. "Car Tyre Replacement",
"Hire a Driver", "Vehicle Insurance", "Petrol", "Vehicle Testing"). The
original values are preserved unchanged; a system category is derived
separately (see Import Mapping below).

## Architecture

- **Frontend:** React + TypeScript (Vite), Tailwind CSS, Recharts for charts.
- **Backend:** Supabase — Postgres (data), Storage (reserved for Phase 2
  document uploads), Auth (reserved for Phase 2).
- **Data flow:** a one-time import script parses both Excel files and writes
  into Postgres. The running app reads only from Postgres — Excel is not a
  live dependency once imported.

## Data Model

### `vehicles`
One row per plate. All 37 Vehicle Report columns, renamed to snake_case,
preserved as-is (nulls stay null, never backfilled). Added columns:
`id` (uuid), `created_at`, `status` (`active` default — source has no status
column, so every vehicle imports as Active; flagged for manual review, not
guessed per-vehicle).

### `expenses`
One row per source expense record. All 22 source columns preserved
(snake_case). Added columns:
- `vehicle_id` (nullable FK to `vehicles`, null = unassigned)
- `raw_vehicle_number_text` (original `"PLATE - Driver"` string, kept for audit)
- `system_category` (`fuel` / `repairs` / `maintenance` / `insurance` /
  `registration` / `finance` / `other` — derived from `type_of_expense` +
  `expense` via keyword rules below; independent of the original fields,
  which are never altered)

### `expense_assignment_audit`
Created now (empty in Phase 1) so Phase 2's manual-assignment feature needs
no migration: `id`, `expense_id`, `assigned_vehicle_id`, `assigned_by`,
`assigned_at`.

### Import mapping: `system_category` rules
Applied to `type_of_expense` + `expense` text, case-insensitive:
- contains "petrol"/"fuel"/"diesel" (as expense text, not fuel-type column) → `fuel`
- contains "insurance" → `insurance`
- contains "repair" or `type_of_expense = Repair` → `repairs`
- contains "servic", "tyre", "test", "cabin filter" → `maintenance`
- contains "renewal", "registration", "license" → `registration`
- everything else (e.g. "Hire a Driver", "New Purchase" items) → `other`

## Import Process & Summary

1. Read both files with the same parsing approach used to inspect them.
2. Normalize plate numbers (trim, collapse whitespace, uppercase) as the
   join key between files.
3. Insert 53 vehicles as-is.
4. Insert 54 expenses; set `vehicle_id` where the normalized plate from
   `Vehicle Number (If Applicable)` matches a vehicle, else leave null.
5. Print/display an import summary matching Section 24:
   `Vehicles Imported / Expenses Imported / Matched Expenses / Unassigned
   Expenses / Records Requiring Review` (review = any row with a
   non-empty vehicle number that still failed to match — expected to be 0
   based on current data, but the script must report it, not assume).

## App Structure (Phase 1 pages)

```
Dashboard
 └─ Vehicles (card grid + table view, search/filter)
     └─ Vehicle Profile
         ├─ Overview   (all present Vehicle Report fields; "Not Available" for empty ones)
         ├─ Expenses   (this vehicle's linked rows, totals, filters, charts)
         ├─ Maintenance (auto-built from expenses where system_category
         │               is maintenance or repairs; source has no separate
         │               maintenance table)
         ├─ Documents  (status derived from expiry-date columns that exist:
         │               License, CID Permit, Advertisement Permit; original
         │               filename shown as reference label — no file preview,
         │               since the actual PDFs weren't provided)
         ├─ Finance    (Vehicle Report finance columns verbatim, or "Not
         │               Available" if empty — no calculation invented)
         └─ Reports    (this vehicle's Cost of Ownership + yearly breakdown)
 └─ Unassigned Expenses (view-only list in Phase 1; the 23 no-plate rows
     plus any vehicle-number row that fails to match; assignment UI is Phase 2)
 └─ Reports (fleet-wide: the 10 report types from Section 17 of the brief,
     view-only, filterable by vehicle/department/driver/year/date
     range/category; export button deferred to Phase 2)
```

Dashboard summary tiles (Section 22): Total/Active/Inactive Vehicles, Total
Fleet Expenses, This Year's Expenses, Maintenance/Repair/Fuel Cost, Upcoming
Renewals, Expired Documents, Unassigned Expenses count, Top 5 Vehicles by
Expense, Upcoming Vehicle Actions (documents expiring soon, from the same
expiry columns).

## Cost of Ownership (per vehicle)

- **Insurance / Maintenance / Repairs / Fuel / Other:** sum of that
  vehicle's linked expenses by `system_category`.
- **Financing:** `monthly_repayment × elapsed instalment months`, capped at
  `finance_amount`; "Not Available" if those columns are empty for the
  vehicle.
- **Depreciation, Taxes & Fees:** always "Not Available" — no purchase
  price or tax data exists in either source file. Never rendered as AED 0.
- **Total Cost / Average Annual / Average Monthly:** sum of the categories
  that have data; categories marked "Not Available" are excluded from the
  sum, not treated as zero, and the UI notes which categories were excluded.
- **Cost per KM:** shown only if `last_service_mileage_km` is present for
  that vehicle; otherwise omitted.
- **Yearly breakdown table:** columns span from each vehicle's
  `registration_date` year to the current year (2026); rows are the same
  categories as above, same "Not Available" handling.

## Vehicle Images

No photo files were supplied (only referenced filenames for Mulkiya/
insurance documents, not actual images). Phase 1 shows a generic vehicle
silhouette placeholder on cards and the profile header for every vehicle.
Real per-vehicle photos are a Phase 2 upload feature; nothing is generated
or guessed to fill the gap.

## Design

White background, Oryx Blue `#022A3A` primary, Silver `#A9A9A9` secondary,
Black body text, per the org design guidelines. Clean cards, simple icons,
minimal animation, desktop-first responsive down to tablet.

## Explicitly Out of Scope for Phase 1

Add/Edit vehicle forms, document upload, maintenance entry, mileage-history
entry, manual expense assignment UI, multi-user auth/permissions,
configurable reminder periods, PDF/Excel export, audit history UI (the
table exists, but nothing writes to it yet). These are Section 19/14/25
requirements deferred to a Phase 2 spec.

## Testing Approach

- Import script: unit-test the plate-normalization and category-mapping
  rules against the real source rows (fixtures taken from the actual
  files), and assert the import summary counts match hand-verified figures
  (53 vehicles, 54 expenses, 31 matched, 23 unassigned, 0 requiring review).
- App: component/integration tests for Cost of Ownership "Not Available"
  vs computed-value branching (the highest-risk area for accidentally
  inventing data), and for the Unassigned Expenses list.
