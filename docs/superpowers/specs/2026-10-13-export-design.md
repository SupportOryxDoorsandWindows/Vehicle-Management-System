# Export (Excel & PDF) — Phase 2 (Sub-project 4) Design

**Date:** 2026-10-13
**Owner:** Business Support (Oryx Doors & Windows)
**Status:** Approved for implementation (next in the owner's "continue Phase 2")

## Summary

Anyone logged in can take the data they already see out of the app: an Excel
download of the vehicle register, expenses and reports, and a print-friendly
"Print / Save as PDF" for the report pages. Read-only: no database changes.

## Scope

### Excel (.xlsx)
| Page | File | Sheets |
|---|---|---|
| Vehicles | `vehicles-<date>.xlsx` | Vehicles: the rows currently shown (search/filters applied), with total expenses and document expiry dates |
| Vehicle → Expenses tab | `<plate>-expenses-<date>.xlsx` | Expenses: the rows currently shown (type filter applied) |
| Unassigned Expenses | `unassigned-expenses-<date>.xlsx` | Unassigned Expenses |
| Reports | `fleet-report-<date>.xlsx` | Summary (department filter, totals), By Category, Expenses (with plate) |

- Amounts are real numbers formatted `#,##0.00`, so they can be summed in
  Excel. Dates are real Excel dates shown as `dd/mm/yyyy`. Headers are bold
  and frozen.
- What you export is what you see: the same filters as on screen.

### PDF
"Print / Save as PDF" on Reports and a vehicle's Reports tab uses the
browser's print dialog, where "Save as PDF" is built in. Print styling hides
the navigation, filters and buttons and keeps the report content.

## Library choice

`write-excel-file` (write-only, ~1 dependency), loaded only when someone
clicks Export so it doesn't slow down the first page load. Not the `xlsx`
package already used by the import script: the npm release of `xlsx` carries
two high-severity advisories (in its file *reading* code), and shipping it to
browsers would add known vulnerabilities to the deployed app, which
currently has none.

## Testing Approach

- Unit: row builders (columns, numbers stay numbers, dates become dates,
  blanks stay empty, totals), file naming, the workbook handed to the
  library.
- Component: each Export button exports exactly the filtered rows; failures
  show a message; Print calls the browser's print.

## Explicitly Out of Scope

Server-side PDF generation, scheduled/emailed reports, CSV, exporting
uploaded documents, custom column selection.
