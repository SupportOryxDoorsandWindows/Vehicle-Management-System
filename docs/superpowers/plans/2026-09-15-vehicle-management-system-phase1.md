# Vehicle Management System — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 read/browse Vehicle Management & Cost Tracking web app, seeded once from the two source Excel files into a dedicated Supabase project.

**Architecture:** React + TypeScript (Vite) SPA reading exclusively from Supabase Postgres via `@supabase/supabase-js`. A one-time Node/TS import pipeline parses the two source `.xlsx` files, normalizes and categorizes the data, and generates SQL that is applied to Supabase once. No document/photo upload, editing, or auth in this phase — see the spec's "Explicitly Out of Scope" section.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Recharts, `@supabase/supabase-js`, `xlsx` (SheetJS) for parsing, Vitest + `@testing-library/react` for tests.

**Spec:** [docs/superpowers/specs/2026-09-15-vehicle-management-system-design.md](../specs/2026-09-15-vehicle-management-system-design.md)

## Global Constraints

- Supabase project for this system: `gcazhqwydpiidnhtczfc` (ref), URL `https://gcazhqwydpiidnhtczfc.supabase.co`. This is a **separate** project from the org's other Supabase project — never point this app's client at any other project ref.
- Source files live at `data/source/Vehicle Report.xlsx` (sheet `Vehicle_Report`) and `data/source/All Expenses.xlsx` (sheet `All_Quartermaster_Expenses`). Never modify these files; they are the import fixtures.
- Never display invented data. Missing vehicle/finance/document fields render as `"Not Available"`. Missing driver/department render as `"Not Assigned"`. A category with no source data renders `"Not Available"`, never `AED 0` — `AED 0` is reserved for a category confirmed to be zero.
- Currency is always AED, formatted as `AED 12,345` (no decimals, `en-AE` locale grouping).
- Brand colors: Oryx Blue `#022A3A` (primary), White `#FFFFFF` (background), Silver `#A9A9A9` (secondary), Black `#000000` (body text). Font stack: `Calibri, "Segoe UI", Arial, sans-serif`.
- Original source field values (`type_of_expense`, `expense`, all Vehicle Report columns) are never rewritten by app logic — `system_category` is always a separate, additional field.
- Phase 1 has no authentication and no write operations from the running app (the import script is the only writer, run once via the service boundary described in Task 5). Do not add login screens, edit forms, or upload UI — that's Phase 2.

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `index.html`, `.gitignore`, `.env.example`
- Create: `src/main.tsx`, `src/App.tsx`, `src/index.css`
- Create: `tailwind.config.ts`, `postcss.config.js`
- Create: `vitest.config.ts`, `src/test/setup.ts`

**Interfaces:**
- Produces: a running Vite dev server, Tailwind available via `className`, Vitest configured with jsdom + `@testing-library/jest-dom` matchers, for every later frontend task to build on.

- [ ] **Step 1: Scaffold the Vite React-TS project**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about the non-empty directory (it contains `data/`, `docs/`), choose to continue in the current directory.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js react-router-dom recharts
npm install -D tailwindcss postcss autoprefixer xlsx vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
```

- [ ] **Step 3: Initialize Tailwind and configure the brand palette**

```bash
npx tailwindcss init -p
```

Replace `tailwind.config.ts` content:

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        oryx: {
          blue: '#022A3A',
          silver: '#A9A9A9',
        },
      },
      fontFamily: {
        sans: ['Calibri', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

Replace `src/index.css` with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-white text-black font-sans;
}
```

- [ ] **Step 4: Configure Vitest**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
  },
});
```

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` scripts: `"test": "vitest run"`.

- [ ] **Step 5: Create `.env.example` and `.gitignore` entries**

Create `.env.example`:

```
VITE_SUPABASE_URL=https://gcazhqwydpiidnhtczfc.supabase.co
VITE_SUPABASE_ANON_KEY=replace_with_publishable_key
```

Append to `.gitignore`:

```
node_modules
dist
.env
supabase/seed/*.sql
```

Copy `.env.example` to `.env` and fill in the real `VITE_SUPABASE_ANON_KEY` value (the publishable key, safe for client-side use): `sb_publishable_QzB3C42HLpG_-f1-3L67Hw_DRL6Fbpo`.

- [ ] **Step 6: Verify the scaffold builds and tests run**

Run: `npm run build`
Expected: builds without errors.

Run: `npm test`
Expected: "No test files found" (expected — no tests written yet) exits without crashing the runner.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS app with Tailwind and Vitest"
```

---

## Task 2: Supabase Schema Migration

**Files:**
- Create: `supabase/migrations/0001_init_schema.sql`

**Interfaces:**
- Produces: tables `public.vehicles`, `public.expenses`, `public.expense_assignment_audit` with the exact column names every later task (import script, API layer) reads and writes.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/0001_init_schema.sql`:

```sql
create table public.vehicles (
  id uuid primary key,
  plate_no text not null unique,
  vehicle_license_expiry_date date,
  branded text,
  cid_permit_expiry date,
  advertisement_permit_expiry date,
  renewal_status text,
  purchase_condition text,
  owner text,
  driver text,
  department text,
  tyre_size text,
  brand text,
  type_of_car text,
  fuel_type text,
  seats text,
  chassis_no text,
  registration_date date,
  model text,
  vehicle_condition text,
  gear_type text,
  warranty_year_km text,
  free_service text,
  last_service_mileage_km numeric,
  remarks text,
  upload_mulkiya text,
  upload_photos_documents text,
  start_date_of_instalments date,
  instalment_in_months numeric,
  monthly_repayment numeric,
  flat_rate numeric,
  end_date_of_instalments date,
  instalment_in_years numeric,
  finance_amount numeric,
  emi_status text,
  source_id text,
  cid_permit_start date,
  advertisement_permit_start date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now()
);

create type public.expense_system_category as enum (
  'fuel', 'insurance', 'repairs', 'maintenance', 'registration', 'finance', 'other'
);

create table public.expenses (
  id uuid primary key,
  vehicle_id uuid references public.vehicles(id),
  supplier_name text,
  date date,
  job_status text,
  payment_terms text,
  type_of_expense text,
  expense text,
  expense_description text,
  cost numeric,
  quotation_number text,
  quotation_file text,
  invoice_number text,
  invoice_file text,
  raw_vehicle_number_text text,
  oryx_employees text,
  teams text,
  other_attachments text,
  requested_by text,
  approved_rejected_by text,
  approval_date date,
  paid_by text,
  payment_date date,
  grouped_expense_reference text,
  system_category public.expense_system_category not null,
  created_at timestamptz not null default now()
);

create table public.expense_assignment_audit (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id),
  assigned_vehicle_id uuid not null references public.vehicles(id),
  assigned_by text not null,
  assigned_at timestamptz not null default now()
);

alter table public.vehicles enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_assignment_audit enable row level security;

create policy "Public read access" on public.vehicles for select using (true);
create policy "Public read access" on public.expenses for select using (true);
create policy "Public read access" on public.expense_assignment_audit for select using (true);
```

- [ ] **Step 2: Apply the migration to the project**

Use the Supabase `apply_migration` MCP tool with `project_id: gcazhqwydpiidnhtczfc`, `name: init_schema`, and the SQL content above.

- [ ] **Step 3: Verify the tables exist**

Use the Supabase `list_tables` MCP tool with `project_id: gcazhqwydpiidnhtczfc`, `schemas: ["public"]`, `verbose: true`.
Expected: `vehicles`, `expenses`, `expense_assignment_audit` present, each with `rls_enabled: true`, and the column lists match the SQL above.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_init_schema.sql
git commit -m "feat: add Supabase schema for vehicles, expenses, and assignment audit"
```

---

## Task 3: Import Data-Mapping Utilities (plate normalization + category derivation)

**Files:**
- Create: `scripts/import/normalize.ts`
- Create: `scripts/import/categorize.ts`
- Test: `scripts/import/__tests__/normalize.test.ts`
- Test: `scripts/import/__tests__/categorize.test.ts`

**Interfaces:**
- Produces: `normalizePlate(raw: string): string`, `extractPlateFromVehicleNumberField(raw: string | null): string | null`, `deriveSystemCategory(typeOfExpense: string, expense: string): SystemCategory`, and the `SystemCategory` type (`'fuel' | 'insurance' | 'repairs' | 'maintenance' | 'registration' | 'finance' | 'other'`) — consumed by Task 5's `buildSeedData` and by the frontend's `src/types`.

- [ ] **Step 1: Write the failing tests for `normalize.ts`**

Create `scripts/import/__tests__/normalize.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { normalizePlate, extractPlateFromVehicleNumberField } from '../normalize';

describe('normalizePlate', () => {
  it('trims, collapses whitespace, and uppercases', () => {
    expect(normalizePlate('  cc 16257  ')).toBe('CC 16257');
    expect(normalizePlate('U   67931')).toBe('U 67931');
  });
});

describe('extractPlateFromVehicleNumberField', () => {
  it('extracts and normalizes the plate before " - "', () => {
    expect(extractPlateFromVehicleNumberField('AA 26891 - Leo Mungcal')).toBe('AA 26891');
    expect(extractPlateFromVehicleNumberField('U 67938 - Lorna Sibanda ')).toBe('U 67938');
  });

  it('returns null for empty input', () => {
    expect(extractPlateFromVehicleNumberField(null)).toBeNull();
    expect(extractPlateFromVehicleNumberField('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- normalize`
Expected: FAIL — `../normalize` has no exported members (file doesn't exist yet).

- [ ] **Step 3: Implement `normalize.ts`**

Create `scripts/import/normalize.ts`:

```ts
export function normalizePlate(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

export function extractPlateFromVehicleNumberField(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const platePart = raw.split(' - ')[0];
  return normalizePlate(platePart);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- normalize`
Expected: PASS

- [ ] **Step 5: Write the failing tests for `categorize.ts`**

Create `scripts/import/__tests__/categorize.test.ts` (fixtures below are real rows from `data/source/All Expenses.xlsx`):

```ts
import { describe, it, expect } from 'vitest';
import { deriveSystemCategory } from '../categorize';

describe('deriveSystemCategory', () => {
  it('maps real fixture rows to the expected category', () => {
    expect(deriveSystemCategory('Service', 'Petrol')).toBe('fuel');
    expect(deriveSystemCategory('Service', 'Vehicle Insurance')).toBe('insurance');
    expect(deriveSystemCategory('Repair', 'Toolbox')).toBe('repairs');
    expect(deriveSystemCategory('Repair', 'Re branding of stickers CIV ')).toBe('repairs');
    expect(deriveSystemCategory('Service', 'Car Tyre Replacement')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Car Tyre Rotation')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Vehicle Testing')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'AC Cabin Filter ')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Car Servicing')).toBe('maintenance');
    expect(deriveSystemCategory('Service', 'Hire a Driver')).toBe('other');
    expect(deriveSystemCategory('New Purchase', 'Tools')).toBe('other');
    expect(deriveSystemCategory('Service', 'CIV Modification')).toBe('other');
  });

  it('maps registration/renewal text to registration (rule for future data; no current row exercises this)', () => {
    expect(deriveSystemCategory('Service', 'Car Renewal')).toBe('registration');
    expect(deriveSystemCategory('Service', 'Vehicle Registration')).toBe('registration');
  });
});
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm test -- categorize`
Expected: FAIL — `../categorize` has no exported members.

- [ ] **Step 7: Implement `categorize.ts`**

Create `scripts/import/categorize.ts`:

```ts
export type SystemCategory =
  | 'fuel'
  | 'insurance'
  | 'repairs'
  | 'maintenance'
  | 'registration'
  | 'finance'
  | 'other';

export function deriveSystemCategory(typeOfExpense: string, expense: string): SystemCategory {
  const type = typeOfExpense.toLowerCase();
  const combined = `${type} ${expense.toLowerCase()}`;

  if (/petrol|fuel|diesel/.test(combined)) return 'fuel';
  if (/insurance/.test(combined)) return 'insurance';
  if (type === 'repair' || /repair/.test(combined)) return 'repairs';
  if (/servic|tyre|test|cabin filter/.test(combined)) return 'maintenance';
  if (/renewal|registration|licen[cs]e/.test(combined)) return 'registration';
  return 'other';
}
```

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- categorize`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add scripts/import/normalize.ts scripts/import/categorize.ts scripts/import/__tests__
git commit -m "feat: add plate normalization and expense category derivation"
```

---

## Task 4: Excel Parsing

**Files:**
- Create: `scripts/import/columnMaps.ts`
- Create: `scripts/import/parseExcel.ts`
- Test: `scripts/import/__tests__/parseExcel.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `readSheetAsObjects(filePath: string, sheetName: string): Record<string, unknown>[]`, `mapRow(row, columnMap): Record<string, unknown>`, `VEHICLE_COLUMN_MAP: [string, string][]`, `EXPENSE_COLUMN_MAP: [string, string][]` — consumed by Task 5's `buildSeedData`.

- [ ] **Step 1: Create the column maps**

Create `scripts/import/columnMaps.ts`:

```ts
export const VEHICLE_COLUMN_MAP: [string, string][] = [
  ['Plate No', 'plate_no'],
  ['Vehicle License Expiry Date', 'vehicle_license_expiry_date'],
  ['Branded', 'branded'],
  ['CID Permit Expiry', 'cid_permit_expiry'],
  ['Advertisement Permit Expiry', 'advertisement_permit_expiry'],
  ['Renewal Status', 'renewal_status'],
  ['Purchase Condition', 'purchase_condition'],
  ['Owner', 'owner'],
  ['Driver', 'driver'],
  ['Department', 'department'],
  ['Tyre Size', 'tyre_size'],
  ['Brand', 'brand'],
  ['Type of Car', 'type_of_car'],
  ['Fuel Type', 'fuel_type'],
  ['Seats', 'seats'],
  ['Chassis No', 'chassis_no'],
  ['Registration Date', 'registration_date'],
  ['Model', 'model'],
  ['Vehicle Condition', 'vehicle_condition'],
  ['Gear Type', 'gear_type'],
  ['Warranty Year/KM', 'warranty_year_km'],
  ['Free Service', 'free_service'],
  ['Last Service Mileage (KM)', 'last_service_mileage_km'],
  ['Remarks', 'remarks'],
  ['Upload Mulkiya', 'upload_mulkiya'],
  ['Upload Photos/Documents', 'upload_photos_documents'],
  ['Start Date of Instalments', 'start_date_of_instalments'],
  ['Instalment in Months', 'instalment_in_months'],
  ['Monthly Repayment', 'monthly_repayment'],
  ['Flat Rate', 'flat_rate'],
  ['End Date of Instalments', 'end_date_of_instalments'],
  ['Instalment in Years', 'instalment_in_years'],
  ['Finance Amount', 'finance_amount'],
  ['EMI Status', 'emi_status'],
  ['ID', 'source_id'],
  ['CID Permit Start', 'cid_permit_start'],
  ['Advertisement Permit Start', 'advertisement_permit_start'],
];

export const EXPENSE_COLUMN_MAP: [string, string][] = [
  ['Supplier Name', 'supplier_name'],
  ['Date', 'date'],
  ['Job Status (If Applicable)', 'job_status'],
  ['Payment Terms', 'payment_terms'],
  ['Type of Expense', 'type_of_expense'],
  ['Expense', 'expense'],
  ['Expense Description', 'expense_description'],
  ['Cost', 'cost'],
  ['Quotation Number', 'quotation_number'],
  ['Quotation', 'quotation_file'],
  ['Invoice Number', 'invoice_number'],
  ['Invoice', 'invoice_file'],
  ['Vehicle Number (If Applicable)', 'raw_vehicle_number_text'],
  ['Oryx Employees (If Applicable)', 'oryx_employees'],
  ['Teams (If Applicable)', 'teams'],
  ['Other Attachments (If Applicable)', 'other_attachments'],
  ['Requested By', 'requested_by'],
  ['Approved/Rejected By', 'approved_rejected_by'],
  ['Approval Date', 'approval_date'],
  ['Paid By', 'paid_by'],
  ['Payment Date', 'payment_date'],
  ['Grouped Expense Reference (If Petty Cash)', 'grouped_expense_reference'],
];
```

- [ ] **Step 2: Write the failing test**

Create `scripts/import/__tests__/parseExcel.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { readSheetAsObjects, mapRow } from '../parseExcel';
import { VEHICLE_COLUMN_MAP, EXPENSE_COLUMN_MAP } from '../columnMaps';

const VEHICLE_FILE = path.resolve(__dirname, '../../../data/source/Vehicle Report.xlsx');
const EXPENSE_FILE = path.resolve(__dirname, '../../../data/source/All Expenses.xlsx');

describe('readSheetAsObjects + mapRow on real source files', () => {
  it('reads all 53 vehicle rows and maps the known U 67931 Ford Ranger row', () => {
    const rows = readSheetAsObjects(VEHICLE_FILE, 'Vehicle_Report').map((r) =>
      mapRow(r, VEHICLE_COLUMN_MAP)
    );
    expect(rows).toHaveLength(53);
    const ranger = rows.find((r) => String(r.plate_no).trim() === 'U 67931');
    expect(ranger).toBeTruthy();
    expect(ranger?.brand).toBe('Ford');
    expect(ranger?.model).toBe('Ranger 2021');
    expect(ranger?.department).toBe('Installation');
  });

  it('reads all 54 expense rows and maps a known vehicle-linked row', () => {
    const rows = readSheetAsObjects(EXPENSE_FILE, 'All_Quartermaster_Expenses').map((r) =>
      mapRow(r, EXPENSE_COLUMN_MAP)
    );
    expect(rows).toHaveLength(54);
    const insuranceRow = rows.find((r) => r.expense === 'Vehicle Insurance');
    expect(insuranceRow).toBeTruthy();
    expect(insuranceRow?.type_of_expense).toBe('Service');
  });

  it('converts empty strings to null', () => {
    const rows = readSheetAsObjects(VEHICLE_FILE, 'Vehicle_Report').map((r) =>
      mapRow(r, VEHICLE_COLUMN_MAP)
    );
    const withBlankRemarks = rows.find((r) => r.remarks === null);
    expect(withBlankRemarks).toBeTruthy();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- parseExcel`
Expected: FAIL — `../parseExcel` has no exported members.

- [ ] **Step 4: Implement `parseExcel.ts`**

Create `scripts/import/parseExcel.ts`:

```ts
import * as XLSX from 'xlsx';

export function readSheetAsObjects(
  filePath: string,
  sheetName: string
): Record<string, unknown>[] {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in ${filePath}`);
  }
  return XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
}

export function mapRow(
  row: Record<string, unknown>,
  columnMap: [string, string][]
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [sourceHeader, targetColumn] of columnMap) {
    let value = row[sourceHeader];
    if (typeof value === 'string') {
      value = value.trim();
      if (value === '') value = null;
    }
    out[targetColumn] = value === undefined ? null : value;
  }
  return out;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- parseExcel`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add scripts/import/columnMaps.ts scripts/import/parseExcel.ts scripts/import/__tests__/parseExcel.test.ts
git commit -m "feat: add Excel sheet parsing and column mapping"
```

---

## Task 5: Build and Apply the Seed Data

**Files:**
- Create: `scripts/import/buildSeedData.ts`
- Create: `scripts/import/toSql.ts`
- Create: `scripts/import/generateSeed.ts`
- Test: `scripts/import/__tests__/buildSeedData.test.ts`
- Test: `scripts/import/__tests__/toSql.test.ts`

**Interfaces:**
- Consumes: `readSheetAsObjects`, `mapRow`, `VEHICLE_COLUMN_MAP`, `EXPENSE_COLUMN_MAP` (Task 4); `normalizePlate`, `extractPlateFromVehicleNumberField` (Task 3); `deriveSystemCategory`, `SystemCategory` (Task 3).
- Produces: `buildSeedData(vehicleFilePath, expenseFilePath): { vehicles: SeedVehicle[]; expenses: SeedExpense[]; summary: ImportSummary }`, generated file `supabase/seed/seed_data.sql` (gitignored — contains real business data), and the actual seeded rows in the `gcazhqwydpiidnhtczfc` project that Task 6 onward reads.

- [ ] **Step 1: Write the failing test for `buildSeedData`**

Create `scripts/import/__tests__/buildSeedData.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { buildSeedData } from '../buildSeedData';

const VEHICLE_FILE = path.resolve(__dirname, '../../../data/source/Vehicle Report.xlsx');
const EXPENSE_FILE = path.resolve(__dirname, '../../../data/source/All Expenses.xlsx');

describe('buildSeedData', () => {
  it('matches the hand-verified import summary from the real source files', () => {
    const { summary } = buildSeedData(VEHICLE_FILE, EXPENSE_FILE);
    expect(summary).toEqual({
      vehiclesImported: 53,
      expensesImported: 54,
      matchedExpenses: 31,
      unassignedExpenses: 23,
      recordsRequiringReview: 0,
    });
  });

  it('assigns every vehicle and expense a unique id, and links matched expenses to the right vehicle', () => {
    const { vehicles, expenses } = buildSeedData(VEHICLE_FILE, EXPENSE_FILE);
    const ids = new Set([...vehicles.map((v) => v.id), ...expenses.map((e) => e.id)]);
    expect(ids.size).toBe(vehicles.length + expenses.length);

    const ranger = vehicles.find((v) => v.plate_no === 'U 67931');
    const insuranceForOtherVehicle = expenses.find(
      (e) => e.raw_vehicle_number_text === 'AA 26891 - Leo Mungcal'
    );
    const rangerVehicle = vehicles.find((v) => v.id === insuranceForOtherVehicle?.vehicle_id);
    expect(rangerVehicle?.plate_no).toBe('AA 26891');
    expect(ranger).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- buildSeedData`
Expected: FAIL — `../buildSeedData` has no exported members.

- [ ] **Step 3: Implement `buildSeedData.ts`**

Create `scripts/import/buildSeedData.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { readSheetAsObjects, mapRow } from './parseExcel';
import { VEHICLE_COLUMN_MAP, EXPENSE_COLUMN_MAP } from './columnMaps';
import { normalizePlate, extractPlateFromVehicleNumberField } from './normalize';
import { deriveSystemCategory } from './categorize';

export interface SeedVehicle extends Record<string, unknown> {
  id: string;
  plate_no: string;
}

export interface SeedExpense extends Record<string, unknown> {
  id: string;
  vehicle_id: string | null;
  system_category: string;
}

export interface ImportSummary {
  vehiclesImported: number;
  expensesImported: number;
  matchedExpenses: number;
  unassignedExpenses: number;
  recordsRequiringReview: number;
}

export function buildSeedData(
  vehicleFilePath: string,
  expenseFilePath: string
): { vehicles: SeedVehicle[]; expenses: SeedExpense[]; summary: ImportSummary } {
  const vehicleRows = readSheetAsObjects(vehicleFilePath, 'Vehicle_Report').map((r) =>
    mapRow(r, VEHICLE_COLUMN_MAP)
  );
  const expenseRows = readSheetAsObjects(expenseFilePath, 'All_Quartermaster_Expenses').map((r) =>
    mapRow(r, EXPENSE_COLUMN_MAP)
  );

  const vehicles: SeedVehicle[] = vehicleRows.map((v) => ({
    id: randomUUID(),
    ...v,
    plate_no: normalizePlate(String(v.plate_no)),
  }));
  const idByPlate = new Map(vehicles.map((v) => [v.plate_no, v.id]));

  let matchedExpenses = 0;
  let unassignedExpenses = 0;
  let recordsRequiringReview = 0;

  const expenses: SeedExpense[] = expenseRows.map((e) => {
    const raw = e.raw_vehicle_number_text as string | null;
    const systemCategory = deriveSystemCategory(
      String(e.type_of_expense ?? ''),
      String(e.expense ?? '')
    );
    let vehicleId: string | null = null;

    if (raw) {
      const plate = extractPlateFromVehicleNumberField(raw);
      vehicleId = (plate && idByPlate.get(plate)) || null;
      if (vehicleId) {
        matchedExpenses++;
      } else {
        recordsRequiringReview++;
      }
    } else {
      unassignedExpenses++;
    }

    return { id: randomUUID(), ...e, vehicle_id: vehicleId, system_category: systemCategory };
  });

  return {
    vehicles,
    expenses,
    summary: {
      vehiclesImported: vehicles.length,
      expensesImported: expenses.length,
      matchedExpenses,
      unassignedExpenses,
      recordsRequiringReview,
    },
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- buildSeedData`
Expected: PASS

- [ ] **Step 5: Write the failing test for `toSql`**

Create `scripts/import/__tests__/toSql.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildInsertSql, sqlValue } from '../toSql';

describe('sqlValue', () => {
  it('quotes strings and escapes single quotes', () => {
    expect(sqlValue("O'Brien")).toBe("'O''Brien'");
  });
  it('renders null/undefined/empty string as NULL', () => {
    expect(sqlValue(null)).toBe('NULL');
    expect(sqlValue(undefined)).toBe('NULL');
    expect(sqlValue('')).toBe('NULL');
  });
  it('renders numbers unquoted', () => {
    expect(sqlValue(1250)).toBe('1250');
  });
  it('renders dates as YYYY-MM-DD', () => {
    expect(sqlValue(new Date('2026-09-15T00:00:00.000Z'))).toBe("'2026-09-15'");
  });
});

describe('buildInsertSql', () => {
  it('builds a multi-row insert statement in column order', () => {
    const sql = buildInsertSql('public.vehicles', ['id', 'plate_no', 'brand'], [
      { id: '1', plate_no: 'U 67931', brand: 'Ford' },
      { id: '2', plate_no: "O'Reilly Plate", brand: null },
    ]);
    expect(sql).toBe(
      "insert into public.vehicles (id, plate_no, brand) values\n" +
        "('1', 'U 67931', 'Ford'),\n" +
        "('2', 'O''Reilly Plate', NULL);"
    );
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- toSql`
Expected: FAIL — `../toSql` has no exported members.

- [ ] **Step 7: Implement `toSql.ts`**

Create `scripts/import/toSql.ts`:

```ts
export function sqlValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (value instanceof Date) return `'${value.toISOString().slice(0, 10)}'`;
  if (typeof value === 'number') return String(value);
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function buildInsertSql(
  table: string,
  columns: string[],
  rows: Record<string, unknown>[]
): string {
  const valueRows = rows.map(
    (row) => `(${columns.map((c) => sqlValue(row[c])).join(', ')})`
  );
  return `insert into ${table} (${columns.join(', ')}) values\n${valueRows.join(',\n')};`;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- toSql`
Expected: PASS

- [ ] **Step 9: Write the seed-generation entry script**

Create `scripts/import/generateSeed.ts`:

```ts
import path from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSeedData } from './buildSeedData';
import { buildInsertSql } from './toSql';

const VEHICLE_COLUMNS = [
  'id', 'plate_no', 'vehicle_license_expiry_date', 'branded', 'cid_permit_expiry',
  'advertisement_permit_expiry', 'renewal_status', 'purchase_condition', 'owner', 'driver',
  'department', 'tyre_size', 'brand', 'type_of_car', 'fuel_type', 'seats', 'chassis_no',
  'registration_date', 'model', 'vehicle_condition', 'gear_type', 'warranty_year_km',
  'free_service', 'last_service_mileage_km', 'remarks', 'upload_mulkiya',
  'upload_photos_documents', 'start_date_of_instalments', 'instalment_in_months',
  'monthly_repayment', 'flat_rate', 'end_date_of_instalments', 'instalment_in_years',
  'finance_amount', 'emi_status', 'source_id', 'cid_permit_start', 'advertisement_permit_start',
];

const EXPENSE_COLUMNS = [
  'id', 'vehicle_id', 'supplier_name', 'date', 'job_status', 'payment_terms',
  'type_of_expense', 'expense', 'expense_description', 'cost', 'quotation_number',
  'quotation_file', 'invoice_number', 'invoice_file', 'raw_vehicle_number_text',
  'oryx_employees', 'teams', 'other_attachments', 'requested_by', 'approved_rejected_by',
  'approval_date', 'paid_by', 'payment_date', 'grouped_expense_reference', 'system_category',
];

function main() {
  const vehicleFile = path.resolve(__dirname, '../../data/source/Vehicle Report.xlsx');
  const expenseFile = path.resolve(__dirname, '../../data/source/All Expenses.xlsx');
  const { vehicles, expenses, summary } = buildSeedData(vehicleFile, expenseFile);

  const sql = [
    buildInsertSql('public.vehicles', VEHICLE_COLUMNS, vehicles),
    buildInsertSql('public.expenses', EXPENSE_COLUMNS, expenses),
  ].join('\n\n');

  const outDir = path.resolve(__dirname, '../../supabase/seed');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, 'seed_data.sql'), sql, 'utf-8');

  console.log('Import Summary');
  console.log(`Vehicles Imported: ${summary.vehiclesImported}`);
  console.log(`Expenses Imported: ${summary.expensesImported}`);
  console.log(`Matched Expenses: ${summary.matchedExpenses}`);
  console.log(`Unassigned Expenses: ${summary.unassignedExpenses}`);
  console.log(`Records Requiring Review: ${summary.recordsRequiringReview}`);
}

main();
```

- [ ] **Step 10: Run the generator and inspect the output**

Run: `npx tsx scripts/import/generateSeed.ts`
Expected console output:
```
Import Summary
Vehicles Imported: 53
Expenses Imported: 54
Matched Expenses: 31
Unassigned Expenses: 23
Records Requiring Review: 0
```
Expected file: `supabase/seed/seed_data.sql` exists with two `insert into ...` statements.

- [ ] **Step 11: Apply the generated seed SQL to the Supabase project**

Read the generated `supabase/seed/seed_data.sql` and pass its full contents to the Supabase `execute_sql` MCP tool with `project_id: gcazhqwydpiidnhtczfc`.

- [ ] **Step 12: Verify the row counts in the database**

Use the Supabase `execute_sql` MCP tool with `project_id: gcazhqwydpiidnhtczfc` and query:
```sql
select
  (select count(*) from public.vehicles) as vehicle_count,
  (select count(*) from public.expenses) as expense_count,
  (select count(*) from public.expenses where vehicle_id is not null) as matched_count;
```
Expected: `vehicle_count: 53`, `expense_count: 54`, `matched_count: 31`.

- [ ] **Step 13: Commit**

```bash
git add scripts/import/buildSeedData.ts scripts/import/toSql.ts scripts/import/generateSeed.ts scripts/import/__tests__/buildSeedData.test.ts scripts/import/__tests__/toSql.test.ts
git commit -m "feat: generate and apply seed SQL from source Excel files"
```

Note: `supabase/seed/seed_data.sql` is gitignored (Task 1, Step 5) — it contains real driver names, costs, and supplier data, so it stays local and in the database, not in git history.

---

## Task 6: Supabase Client, Shared Types, and API Layer

**Files:**
- Create: `src/lib/supabaseClient.ts`
- Create: `src/types/index.ts`
- Create: `src/api/vehicles.ts`
- Create: `src/api/expenses.ts`
- Test: `src/api/__tests__/vehicles.integration.test.ts`
- Test: `src/api/__tests__/expenses.integration.test.ts`

**Interfaces:**
- Consumes: the seeded `gcazhqwydpiidnhtczfc` project (Task 5), `SystemCategory` type (Task 3).
- Produces: `supabase` client instance; `Vehicle`, `Expense` types; `fetchVehicles(): Promise<Vehicle[]>`, `fetchVehicleById(id): Promise<Vehicle | null>`, `fetchExpensesByVehicle(vehicleId): Promise<Expense[]>`, `fetchUnassignedExpenses(): Promise<Expense[]>`, `fetchAllExpenses(): Promise<Expense[]>` — consumed by every page task from Task 8 onward.

These are integration tests against the real seeded project (no mocking) — this is the layer that would catch a schema/column mismatch, which matters more here than isolation.

- [ ] **Step 1: Create the Supabase client**

Create `src/lib/supabaseClient.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Define shared types**

Create `src/types/index.ts`:

```ts
import type { SystemCategory } from '../../scripts/import/categorize';

export type { SystemCategory };

export interface Vehicle {
  id: string;
  plate_no: string;
  vehicle_license_expiry_date: string | null;
  branded: string | null;
  cid_permit_expiry: string | null;
  advertisement_permit_expiry: string | null;
  renewal_status: string | null;
  purchase_condition: string | null;
  owner: string | null;
  driver: string | null;
  department: string | null;
  tyre_size: string | null;
  brand: string | null;
  type_of_car: string | null;
  fuel_type: string | null;
  seats: string | null;
  chassis_no: string | null;
  registration_date: string | null;
  model: string | null;
  vehicle_condition: string | null;
  gear_type: string | null;
  warranty_year_km: string | null;
  free_service: string | null;
  last_service_mileage_km: number | null;
  remarks: string | null;
  upload_mulkiya: string | null;
  upload_photos_documents: string | null;
  start_date_of_instalments: string | null;
  instalment_in_months: number | null;
  monthly_repayment: number | null;
  flat_rate: number | null;
  end_date_of_instalments: string | null;
  instalment_in_years: number | null;
  finance_amount: number | null;
  emi_status: string | null;
  source_id: string | null;
  cid_permit_start: string | null;
  advertisement_permit_start: string | null;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Expense {
  id: string;
  vehicle_id: string | null;
  supplier_name: string | null;
  date: string | null;
  job_status: string | null;
  payment_terms: string | null;
  type_of_expense: string | null;
  expense: string | null;
  expense_description: string | null;
  cost: number | null;
  quotation_number: string | null;
  quotation_file: string | null;
  invoice_number: string | null;
  invoice_file: string | null;
  raw_vehicle_number_text: string | null;
  oryx_employees: string | null;
  teams: string | null;
  other_attachments: string | null;
  requested_by: string | null;
  approved_rejected_by: string | null;
  approval_date: string | null;
  paid_by: string | null;
  payment_date: string | null;
  grouped_expense_reference: string | null;
  system_category: SystemCategory;
  created_at: string;
}
```

- [ ] **Step 3: Write the failing integration test for the vehicles API**

Create `src/api/__tests__/vehicles.integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fetchVehicles, fetchVehicleById } from '../vehicles';

describe('vehicles API (integration, real Supabase project)', () => {
  it('fetches all 53 seeded vehicles ordered by plate_no', async () => {
    const vehicles = await fetchVehicles();
    expect(vehicles).toHaveLength(53);
    expect(vehicles[0].plate_no <= vehicles[1].plate_no).toBe(true);
  });

  it('fetches the known U 67931 Ford Ranger by id', async () => {
    const vehicles = await fetchVehicles();
    const ranger = vehicles.find((v) => v.plate_no === 'U 67931')!;
    const byId = await fetchVehicleById(ranger.id);
    expect(byId?.brand).toBe('Ford');
    expect(byId?.model).toBe('Ranger 2021');
  });

  it('returns null for an unknown id', async () => {
    const result = await fetchVehicleById('00000000-0000-0000-0000-000000000000');
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- vehicles.integration`
Expected: FAIL — `../vehicles` has no exported members.

- [ ] **Step 5: Implement `src/api/vehicles.ts`**

```ts
import { supabase } from '../lib/supabaseClient';
import type { Vehicle } from '../types';

export async function fetchVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from('vehicles').select('*').order('plate_no');
  if (error) throw error;
  return data as Vehicle[];
}

export async function fetchVehicleById(id: string): Promise<Vehicle | null> {
  const { data, error } = await supabase.from('vehicles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as Vehicle | null;
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- vehicles.integration`
Expected: PASS

- [ ] **Step 7: Write the failing integration test for the expenses API**

Create `src/api/__tests__/expenses.integration.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fetchVehicles } from '../vehicles';
import { fetchExpensesByVehicle, fetchUnassignedExpenses, fetchAllExpenses } from '../expenses';

describe('expenses API (integration, real Supabase project)', () => {
  it('fetches all 54 seeded expenses', async () => {
    const expenses = await fetchAllExpenses();
    expect(expenses).toHaveLength(54);
  });

  it('fetches the 23 unassigned expenses', async () => {
    const expenses = await fetchUnassignedExpenses();
    expect(expenses).toHaveLength(23);
    expect(expenses.every((e) => e.vehicle_id === null)).toBe(true);
  });

  it('fetches expenses for a specific vehicle', async () => {
    const vehicles = await fetchVehicles();
    const withPlate = vehicles.find((v) => v.plate_no === 'AA 26891')!;
    const expenses = await fetchExpensesByVehicle(withPlate.id);
    expect(expenses.length).toBeGreaterThan(0);
    expect(expenses.every((e) => e.vehicle_id === withPlate.id)).toBe(true);
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npm test -- expenses.integration`
Expected: FAIL — `../expenses` has no exported members.

- [ ] **Step 9: Implement `src/api/expenses.ts`**

```ts
import { supabase } from '../lib/supabaseClient';
import type { Expense } from '../types';

export async function fetchExpensesByVehicle(vehicleId: string): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}

export async function fetchUnassignedExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .is('vehicle_id', null)
    .order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}

export async function fetchAllExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
  if (error) throw error;
  return data as Expense[];
}
```

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test -- expenses.integration`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/lib/supabaseClient.ts src/types/index.ts src/api
git commit -m "feat: add Supabase client, shared types, and vehicles/expenses API layer"
```

---

## Task 7: Domain Calculation Libraries (document status + cost of ownership)

**Files:**
- Create: `src/lib/documentStatus.ts`
- Create: `src/lib/costOfOwnership.ts`
- Create: `src/lib/format.ts`
- Test: `src/lib/__tests__/documentStatus.test.ts`
- Test: `src/lib/__tests__/costOfOwnership.test.ts`

**Interfaces:**
- Consumes: `SystemCategory` (Task 3), `Vehicle`/`Expense` types (Task 6).
- Produces: `getDocumentStatus(expiryDate, asOf, expiringSoonDays?): 'valid'|'expiring_soon'|'expired'|'not_available'`; `calculateCostOfOwnership(expenses, finance, registrationDate, lastServiceMileageKm, asOf): CostOfOwnership`; `formatAED(amount): string` — consumed by Dashboard (Task 9), Documents tab (Task 12), Reports tab (Task 13), fleet Reports page (Task 15).

This is the highest-risk logic in the app per the spec (never render "Not Available" data as `AED 0`) — test it thoroughly before any UI consumes it.

- [ ] **Step 1: Write the failing tests for `documentStatus.ts`**

Create `src/lib/__tests__/documentStatus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getDocumentStatus } from '../documentStatus';

describe('getDocumentStatus', () => {
  const asOf = new Date('2026-09-15T00:00:00.000Z');

  it('returns not_available when there is no expiry date', () => {
    expect(getDocumentStatus(null, asOf)).toBe('not_available');
  });

  it('returns expired for a past date', () => {
    expect(getDocumentStatus('2026-01-01', asOf)).toBe('expired');
  });

  it('returns expiring_soon within the default 30-day window', () => {
    expect(getDocumentStatus('2026-09-30', asOf)).toBe('expiring_soon');
  });

  it('returns valid for a date beyond the window', () => {
    expect(getDocumentStatus('2027-01-01', asOf)).toBe('valid');
  });

  it('respects a custom expiringSoonDays', () => {
    expect(getDocumentStatus('2026-10-01', asOf, 7)).toBe('valid');
    expect(getDocumentStatus('2026-09-20', asOf, 7)).toBe('expiring_soon');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- documentStatus`
Expected: FAIL — `../documentStatus` has no exported members.

- [ ] **Step 3: Implement `documentStatus.ts`**

Create `src/lib/documentStatus.ts`:

```ts
export type DocumentStatus = 'valid' | 'expiring_soon' | 'expired' | 'not_available';

export function getDocumentStatus(
  expiryDate: string | null,
  asOf: Date,
  expiringSoonDays = 30
): DocumentStatus {
  if (!expiryDate) return 'not_available';
  const expiry = new Date(expiryDate);
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilExpiry = Math.floor((expiry.getTime() - asOf.getTime()) / msPerDay);
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= expiringSoonDays) return 'expiring_soon';
  return 'valid';
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- documentStatus`
Expected: PASS

- [ ] **Step 5: Write `format.ts` (no test needed — trivial formatting, exercised by consuming component tests)**

Create `src/lib/format.ts`:

```ts
export function formatAED(amount: number | null): string {
  if (amount === null) return 'Not Available';
  return `AED ${Math.round(amount).toLocaleString('en-AE')}`;
}
```

- [ ] **Step 6: Write the failing tests for `costOfOwnership.ts`**

Create `src/lib/__tests__/costOfOwnership.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateCostOfOwnership, type ExpenseLike, type VehicleFinanceInfo } from '../costOfOwnership';

describe('calculateCostOfOwnership', () => {
  const asOf = new Date('2026-09-15T00:00:00.000Z');
  const noFinance: VehicleFinanceInfo = {
    monthlyRepayment: null,
    financeAmount: null,
    startDateOfInstalments: null,
  };

  it('shows Not Available (null), never AED 0, for a category with zero matching expenses', () => {
    const expenses: ExpenseLike[] = [{ systemCategory: 'maintenance', cost: 500 }];
    const result = calculateCostOfOwnership(expenses, noFinance, null, null, asOf);
    expect(result.categories.fuel).toBeNull();
    expect(result.categories.maintenance).toBe(500);
  });

  it('always marks depreciation and taxesAndFees as Not Available (no source data exists for either)', () => {
    const result = calculateCostOfOwnership([], noFinance, null, null, asOf);
    expect(result.categories.depreciation).toBeNull();
    expect(result.categories.taxesAndFees).toBeNull();
    expect(result.excludedCategories).toContain('depreciation');
    expect(result.excludedCategories).toContain('taxesAndFees');
  });

  it('sums only present categories into totalCost, excluding Not Available ones', () => {
    const expenses: ExpenseLike[] = [
      { systemCategory: 'fuel', cost: 100 },
      { systemCategory: 'insurance', cost: 200 },
    ];
    const result = calculateCostOfOwnership(expenses, noFinance, null, null, asOf);
    expect(result.totalCost).toBe(300);
  });

  it('calculates financing as monthly repayment times elapsed months, capped at finance amount', () => {
    const finance: VehicleFinanceInfo = {
      monthlyRepayment: 1000,
      financeAmount: 5000,
      startDateOfInstalments: '2026-01-15',
    };
    const result = calculateCostOfOwnership([], finance, null, null, asOf);
    // asOf is 2026-09-15, start 2026-01-15 -> 8 months elapsed -> 8000, capped at 5000
    expect(result.categories.financing).toBe(5000);
  });

  it('returns null financing when finance fields are missing', () => {
    const result = calculateCostOfOwnership([], noFinance, null, null, asOf);
    expect(result.categories.financing).toBeNull();
  });

  it('computes averageAnnualCost only when registrationDate is present', () => {
    const withoutReg = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1200 }],
      noFinance,
      null,
      null,
      asOf
    );
    expect(withoutReg.averageAnnualCost).toBeNull();

    const withReg = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1200 }],
      noFinance,
      '2025-09-15',
      null,
      asOf
    );
    expect(withReg.averageAnnualCost).toBe(600); // 1200 total / 2 years elapsed (inclusive)
  });

  it('computes costPerKm only when mileage is present and positive', () => {
    const withoutMileage = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1000 }],
      noFinance,
      null,
      null,
      asOf
    );
    expect(withoutMileage.costPerKm).toBeNull();

    const withMileage = calculateCostOfOwnership(
      [{ systemCategory: 'fuel', cost: 1000 }],
      noFinance,
      null,
      100,
      asOf
    );
    expect(withMileage.costPerKm).toBe(10);
  });
});
```

- [ ] **Step 7: Run the tests to verify they fail**

Run: `npm test -- costOfOwnership`
Expected: FAIL — `../costOfOwnership` has no exported members.

- [ ] **Step 8: Implement `costOfOwnership.ts`**

Create `src/lib/costOfOwnership.ts`:

```ts
import type { SystemCategory } from '../types';

const SUMMABLE_CATEGORIES = ['fuel', 'insurance', 'repairs', 'maintenance', 'registration', 'other'] as const;
type SummableCategory = (typeof SUMMABLE_CATEGORIES)[number];

export interface ExpenseLike {
  systemCategory: SystemCategory;
  cost: number | null;
}

export interface VehicleFinanceInfo {
  monthlyRepayment: number | null;
  financeAmount: number | null;
  startDateOfInstalments: string | null;
}

export interface CostOfOwnership {
  categories: Record<SummableCategory | 'financing' | 'depreciation' | 'taxesAndFees', number | null>;
  totalCost: number;
  excludedCategories: string[];
  averageAnnualCost: number | null;
  averageMonthlyCost: number | null;
  costPerKm: number | null;
}

function sumByCategory(expenses: ExpenseLike[]): Record<SummableCategory, number | null> {
  const totals = {} as Record<SummableCategory, number | null>;
  for (const category of SUMMABLE_CATEGORIES) {
    const matches = expenses.filter((e) => e.systemCategory === category);
    totals[category] =
      matches.length === 0 ? null : matches.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  }
  return totals;
}

function calculateFinancingCost(finance: VehicleFinanceInfo, asOf: Date): number | null {
  if (
    finance.monthlyRepayment == null ||
    finance.financeAmount == null ||
    !finance.startDateOfInstalments
  ) {
    return null;
  }
  const start = new Date(finance.startDateOfInstalments);
  const monthsElapsed = Math.max(
    0,
    (asOf.getFullYear() - start.getFullYear()) * 12 + (asOf.getMonth() - start.getMonth())
  );
  return Math.min(finance.monthlyRepayment * monthsElapsed, finance.financeAmount);
}

export function calculateCostOfOwnership(
  expenses: ExpenseLike[],
  finance: VehicleFinanceInfo,
  registrationDate: string | null,
  lastServiceMileageKm: number | null,
  asOf: Date
): CostOfOwnership {
  const categories = {
    ...sumByCategory(expenses),
    financing: calculateFinancingCost(finance, asOf),
    depreciation: null,
    taxesAndFees: null,
  };

  const excludedCategories = Object.entries(categories)
    .filter(([, value]) => value === null)
    .map(([key]) => key);

  const totalCost = Object.values(categories).reduce(
    (sum: number, value) => sum + (value ?? 0),
    0
  );

  let averageAnnualCost: number | null = null;
  let averageMonthlyCost: number | null = null;
  if (registrationDate) {
    const start = new Date(registrationDate);
    const years = Math.max(1, asOf.getFullYear() - start.getFullYear() + 1);
    averageAnnualCost = totalCost / years;
    averageMonthlyCost = totalCost / (years * 12);
  }

  const costPerKm =
    lastServiceMileageKm && lastServiceMileageKm > 0 ? totalCost / lastServiceMileageKm : null;

  return { categories, totalCost, excludedCategories, averageAnnualCost, averageMonthlyCost, costPerKm };
}
```

- [ ] **Step 9: Run the tests to verify they pass**

Run: `npm test -- costOfOwnership`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/lib
git commit -m "feat: add document status and cost of ownership calculation libraries"
```

---

## Task 8: App Shell (router, layout, navigation)

**Files:**
- Modify: `src/App.tsx`
- Create: `src/components/Layout.tsx`
- Create: `src/components/NavBar.tsx`

**Interfaces:**
- Consumes: nothing beyond React Router.
- Produces: routes `/`, `/vehicles`, `/vehicles/:id`, `/vehicles/:id/expenses`, `/vehicles/:id/maintenance`, `/vehicles/:id/documents`, `/vehicles/:id/finance`, `/vehicles/:id/reports`, `/unassigned-expenses`, `/reports` — consumed by every page task from Task 9 onward, which register their component at these paths.

- [ ] **Step 1: Write the failing test**

Create `src/__tests__/App.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('App shell', () => {
  it('renders the nav bar with links to Dashboard, Vehicles, Unassigned Expenses, and Reports', () => {
    render(<App />);
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /unassigned expenses/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reports/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- App.test`
Expected: FAIL — no nav links exist yet in the default Vite `App.tsx`.

- [ ] **Step 3: Implement `NavBar.tsx`, `Layout.tsx`, and `App.tsx`**

Create `src/components/NavBar.tsx`:

```tsx
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/vehicles', label: 'Vehicles' },
  { to: '/unassigned-expenses', label: 'Unassigned Expenses' },
  { to: '/reports', label: 'Reports' },
];

export function NavBar() {
  return (
    <nav className="bg-oryx-blue text-white px-6 py-4 flex gap-6">
      <span className="font-bold">Oryx Vehicle Management</span>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          className={({ isActive }) =>
            isActive ? 'underline font-semibold' : 'opacity-80 hover:opacity-100'
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
```

Create `src/components/Layout.tsx`:

```tsx
import type { ReactNode } from 'react';
import { NavBar } from './NavBar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <NavBar />
      <main className="p-6 max-w-7xl mx-auto">{children}</main>
    </div>
  );
}
```

Replace `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Vehicles } from './pages/Vehicles';
import { VehicleProfileLayout } from './pages/vehicle/VehicleProfileLayout';
import { Overview } from './pages/vehicle/Overview';
import { VehicleExpenses } from './pages/vehicle/VehicleExpenses';
import { Maintenance } from './pages/vehicle/Maintenance';
import { Documents } from './pages/vehicle/Documents';
import { Finance } from './pages/vehicle/Finance';
import { VehicleReports } from './pages/vehicle/VehicleReports';
import { UnassignedExpenses } from './pages/UnassignedExpenses';
import { Reports } from './pages/Reports';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vehicles" element={<Vehicles />} />
          <Route path="/vehicles/:id" element={<VehicleProfileLayout />}>
            <Route index element={<Overview />} />
            <Route path="expenses" element={<VehicleExpenses />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="documents" element={<Documents />} />
            <Route path="finance" element={<Finance />} />
            <Route path="reports" element={<VehicleReports />} />
          </Route>
          <Route path="/unassigned-expenses" element={<UnassignedExpenses />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
```

Each page referenced above is a stub at this point (`export function X() { return <div>X</div>; }` in its file) — Tasks 9 through 15 replace the stubs with real implementations. Create each stub file now so the app compiles:

- `src/pages/Dashboard.tsx`
- `src/pages/Vehicles.tsx`
- `src/pages/vehicle/VehicleProfileLayout.tsx` (must render `<Outlet />` from `react-router-dom` for nested routes)
- `src/pages/vehicle/Overview.tsx`
- `src/pages/vehicle/VehicleExpenses.tsx`
- `src/pages/vehicle/Maintenance.tsx`
- `src/pages/vehicle/Documents.tsx`
- `src/pages/vehicle/Finance.tsx`
- `src/pages/vehicle/VehicleReports.tsx`
- `src/pages/UnassignedExpenses.tsx`
- `src/pages/Reports.tsx`

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- App.test`
Expected: PASS

- [ ] **Step 5: Verify the app runs in the browser**

Run: `npm run dev`, open the printed local URL. Confirm the nav bar renders in Oryx Blue with white text and the four links navigate without errors (pages will be blank stubs).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components src/pages src/__tests__
git commit -m "feat: add app shell with routing and navigation"
```

---

## Task 9: Vehicles Page (cards, table view, search/filter)

**Files:**
- Modify: `src/pages/Vehicles.tsx`
- Create: `src/components/VehicleCard.tsx`
- Create: `src/components/VehiclePlaceholderImage.tsx`
- Test: `src/pages/__tests__/Vehicles.test.tsx`
- Test: `src/components/__tests__/VehicleCard.test.tsx`

**Interfaces:**
- Consumes: `fetchVehicles` (Task 6), `Vehicle` type (Task 6), `formatAED` (Task 7).
- Produces: `<Vehicles />` page rendering the full grid with search/filter; `<VehicleCard vehicle={...} totalExpenses={...} />` component reused by nothing else in Phase 1 but designed for Phase 2 reuse.

- [ ] **Step 1: Write the failing test for `VehicleCard`**

Create `src/components/__tests__/VehicleCard.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { VehicleCard } from '../VehicleCard';
import type { Vehicle } from '../../types';

const vehicle: Vehicle = {
  id: 'v1',
  plate_no: 'U 67931',
  brand: 'Ford',
  model: 'Ranger 2021',
  driver: 'Ronald Abrea Samontina',
  department: 'Installation',
  vehicle_condition: 'Good',
  status: 'active',
} as Vehicle;

describe('VehicleCard', () => {
  it('shows make, model, plate, driver, department, condition, status, and total expenses', () => {
    render(
      <MemoryRouter>
        <VehicleCard vehicle={vehicle} totalExpenses={5000} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument();
    expect(screen.getByText(/U 67931/)).toBeInTheDocument();
    expect(screen.getByText(/Ronald Abrea Samontina/)).toBeInTheDocument();
    expect(screen.getByText(/Installation/)).toBeInTheDocument();
    expect(screen.getByText(/Good/)).toBeInTheDocument();
    expect(screen.getByText(/AED 5,000/)).toBeInTheDocument();
  });

  it('shows Not Assigned when driver is missing', () => {
    render(
      <MemoryRouter>
        <VehicleCard vehicle={{ ...vehicle, driver: null }} totalExpenses={0} />
      </MemoryRouter>
    );
    expect(screen.getByText(/Not Assigned/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- VehicleCard`
Expected: FAIL — `../VehicleCard` has no exported members.

- [ ] **Step 3: Implement `VehiclePlaceholderImage.tsx` and `VehicleCard.tsx`**

Create `src/components/VehiclePlaceholderImage.tsx`:

```tsx
export function VehiclePlaceholderImage({ className }: { className?: string }) {
  return (
    <div className={`bg-white border border-oryx-silver flex items-center justify-center ${className ?? ''}`}>
      <svg viewBox="0 0 200 100" className="w-full h-full p-4" aria-label="Vehicle photo not available">
        <rect x="20" y="55" width="160" height="30" rx="6" fill="#A9A9A9" />
        <circle cx="55" cy="88" r="10" fill="#022A3A" />
        <circle cx="145" cy="88" r="10" fill="#022A3A" />
        <path d="M40 55 L60 30 H140 L160 55 Z" fill="#A9A9A9" opacity="0.6" />
      </svg>
    </div>
  );
}
```

Create `src/components/VehicleCard.tsx`:

```tsx
import { Link } from 'react-router-dom';
import type { Vehicle } from '../types';
import { formatAED } from '../lib/format';
import { VehiclePlaceholderImage } from './VehiclePlaceholderImage';

export function VehicleCard({ vehicle, totalExpenses }: { vehicle: Vehicle; totalExpenses: number }) {
  return (
    <Link
      to={`/vehicles/${vehicle.id}`}
      className="block border border-oryx-silver rounded-lg overflow-hidden hover:shadow-md transition-shadow"
    >
      <VehiclePlaceholderImage className="h-36" />
      <div className="p-4">
        <h3 className="font-semibold text-oryx-blue">
          {vehicle.brand} {vehicle.model}
        </h3>
        <p className="text-sm text-black">Plate: {vehicle.plate_no}</p>
        <p className="text-sm text-black">Driver: {vehicle.driver ?? 'Not Assigned'}</p>
        <p className="text-sm text-black">Department: {vehicle.department ?? 'Not Assigned'}</p>
        <div className="flex justify-between mt-2 text-sm">
          <span>Condition: {vehicle.vehicle_condition ?? 'Not Available'}</span>
          <span className="capitalize">Status: {vehicle.status}</span>
        </div>
        <p className="mt-2 font-semibold text-oryx-blue">Total Expenses: {formatAED(totalExpenses)}</p>
      </div>
    </Link>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- VehicleCard`
Expected: PASS

- [ ] **Step 5: Write the failing test for the Vehicles page**

Create `src/pages/__tests__/Vehicles.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Vehicles } from '../Vehicles';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import type { Vehicle, Expense } from '../../types';

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', driver: 'Ronald', department: 'Installation', vehicle_condition: 'Good', status: 'active' } as Vehicle,
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022', driver: 'Mark', department: 'Installation', vehicle_condition: 'Good', status: 'active' } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 1000 } as Expense,
];

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
});

describe('Vehicles page', () => {
  it('renders a card per vehicle with computed total expenses', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    expect(screen.getByText(/Toyota Prado 2022/)).toBeInTheDocument();
    expect(screen.getByText(/AED 1,000/)).toBeInTheDocument();
  });

  it('filters by search text across plate, model, driver, and department', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.type(screen.getByPlaceholderText(/search/i), 'Prado');
    expect(screen.queryByText(/Ford Ranger 2021/)).not.toBeInTheDocument();
    expect(screen.getByText(/Toyota Prado 2022/)).toBeInTheDocument();
  });

  it('filters by department dropdown', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText(/department/i), 'Installation');
    expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument();
    expect(screen.getByText(/Toyota Prado 2022/)).toBeInTheDocument();
  });

  it('filters by status dropdown', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'inactive');
    expect(screen.queryByText(/Ford Ranger 2021/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Toyota Prado 2022/)).not.toBeInTheDocument();
  });

  it('toggles to a table view listing the same filtered vehicles as rows', async () => {
    render(<MemoryRouter><Vehicles /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /table view/i }));
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'U 67931' })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- Vehicles.test`
Expected: FAIL — the stub `Vehicles` page renders none of this.

- [ ] **Step 7: Implement `src/pages/Vehicles.tsx`**

Covers the spec's search (plate/model/driver/department), filters (Active/Inactive, Department), and "table/list view if practical" requirements together, since they all operate on the same filtered vehicle list.

```tsx
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses } from '../api/expenses';
import { VehicleCard } from '../components/VehicleCard';
import { formatAED } from '../lib/format';
import type { Vehicle, Expense } from '../types';

export function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [view, setView] = useState<'cards' | 'table'>('cards');

  useEffect(() => {
    fetchVehicles().then(setVehicles);
    fetchAllExpenses().then(setExpenses);
  }, []);

  const totalsByVehicle = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      if (!e.vehicle_id || e.cost == null) continue;
      totals.set(e.vehicle_id, (totals.get(e.vehicle_id) ?? 0) + e.cost);
    }
    return totals;
  }, [expenses]);

  const departments = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.department).filter(Boolean))) as string[],
    [vehicles]
  );

  const filtered = useMemo(() => {
    const query = search.toLowerCase();
    return vehicles.filter((v) => {
      if (department && v.department !== department) return false;
      if (status && v.status !== status) return false;
      if (!query) return true;
      return [v.plate_no, v.model, v.driver, v.department]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query));
    });
  }, [vehicles, search, department, status]);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-oryx-blue">Vehicles</h1>
        <button
          type="button"
          onClick={() => setView(view === 'cards' ? 'table' : 'cards')}
          className="border border-oryx-silver rounded px-3 py-1 text-sm"
        >
          {view === 'cards' ? 'Table View' : 'Card View'}
        </button>
      </div>
      <div className="flex flex-wrap gap-4 mb-4">
        <input
          type="text"
          placeholder="Search by plate, model, driver, or department"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-oryx-silver rounded px-3 py-2 flex-1 min-w-[240px]"
        />
        <label className="text-sm">
          Department{' '}
          <select
            aria-label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className="border border-oryx-silver rounded px-2 py-1"
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          Status{' '}
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border border-oryx-silver rounded px-2 py-1"
          >
            <option value="">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
      </div>
      {view === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <VehicleCard key={v.id} vehicle={v} totalExpenses={totalsByVehicle.get(v.id) ?? 0} />
          ))}
        </div>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-oryx-silver">
              <th className="py-2">Plate</th>
              <th>Make</th>
              <th>Model</th>
              <th>Driver</th>
              <th>Department</th>
              <th>Condition</th>
              <th>Status</th>
              <th>Total Expenses</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
              <tr key={v.id} className="border-b border-oryx-silver">
                <td className="py-2">
                  <Link to={`/vehicles/${v.id}`} className="text-oryx-blue underline">
                    {v.plate_no}
                  </Link>
                </td>
                <td>{v.brand ?? 'Not Available'}</td>
                <td>{v.model ?? 'Not Available'}</td>
                <td>{v.driver ?? 'Not Assigned'}</td>
                <td>{v.department ?? 'Not Assigned'}</td>
                <td>{v.vehicle_condition ?? 'Not Available'}</td>
                <td className="capitalize">{v.status}</td>
                <td>{formatAED(totalsByVehicle.get(v.id) ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- Vehicles.test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/pages/Vehicles.tsx src/components/VehicleCard.tsx src/components/VehiclePlaceholderImage.tsx src/pages/__tests__/Vehicles.test.tsx src/components/__tests__/VehicleCard.test.tsx
git commit -m "feat: add Vehicles page with cards, search, and computed totals"
```

---

## Task 10: Vehicle Profile Shell + Overview + Finance Tabs

**Files:**
- Modify: `src/pages/vehicle/VehicleProfileLayout.tsx`
- Modify: `src/pages/vehicle/Overview.tsx`
- Modify: `src/pages/vehicle/Finance.tsx`
- Create: `src/components/FieldList.tsx`
- Test: `src/pages/vehicle/__tests__/Overview.test.tsx`
- Test: `src/pages/vehicle/__tests__/Finance.test.tsx`

**Interfaces:**
- Consumes: `fetchVehicleById` (Task 6), `Vehicle` type (Task 6), `formatAED` (Task 7).
- Produces: `<FieldList fields={{label: value}} />` reused by Task 12 (Documents) and Task 13 (Reports) for consistent "Not Available" rendering; `VehicleProfileLayout` provides `vehicle` to child routes via `useOutletContext<Vehicle>()`.

- [ ] **Step 1: Implement `VehicleProfileLayout.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useParams } from 'react-router-dom';
import { fetchVehicleById } from '../../api/vehicles';
import type { Vehicle } from '../../types';

const tabs = [
  { to: '', label: 'Overview', end: true },
  { to: 'expenses', label: 'Expenses' },
  { to: 'maintenance', label: 'Maintenance' },
  { to: 'documents', label: 'Documents' },
  { to: 'finance', label: 'Finance' },
  { to: 'reports', label: 'Reports' },
];

export function VehicleProfileLayout() {
  const { id } = useParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    if (id) fetchVehicleById(id).then(setVehicle);
  }, [id]);

  if (!vehicle) return <p>Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-1">
        {vehicle.brand} {vehicle.model}
      </h1>
      <p className="text-oryx-silver mb-4">Plate: {vehicle.plate_no}</p>
      <div className="flex gap-4 border-b border-oryx-silver mb-4">
        {tabs.map((tab) => (
          <NavLink
            key={tab.label}
            to={tab.to}
            end={tab.end}
            className={({ isActive }) =>
              `pb-2 ${isActive ? 'border-b-2 border-oryx-blue font-semibold text-oryx-blue' : 'text-black'}`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
      <Outlet context={vehicle} />
    </div>
  );
}
```

- [ ] **Step 2: Implement `FieldList.tsx`**

```tsx
export function FieldList({ fields }: { fields: Record<string, string | number | null> }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {Object.entries(fields).map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-oryx-silver">{label}</dt>
          <dd className="text-black">{value === null || value === '' ? 'Not Available' : value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

- [ ] **Step 3: Write the failing test for `Overview.tsx`**

Create `src/pages/vehicle/__tests__/Overview.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Overview } from '../Overview';
import type { Vehicle } from '../../../types';

const vehicle: Vehicle = {
  plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', type_of_car: 'Pickup',
  vehicle_condition: 'Good', driver: 'Ronald', department: 'Installation',
  chassis_no: 'AFAFP3RP5MJD18678', gear_type: 'Automatic', tyre_size: '215/70R16',
  owner: 'Oryx Door Systems LLC', fuel_type: 'Diesel', seats: '5 seater',
  registration_date: '2020-11-24', last_service_mileage_km: 316585, status: 'active',
  remarks: null,
} as Vehicle;

function renderWithContext() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<div />}>
          <Route index element={<Overview />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Overview tab', () => {
  it('renders all present fields and Not Available for empty ones', () => {
    // Overview reads the vehicle via useOutletContext, so render it directly with a stub context provider
  });
});
```

Since `Overview` reads `useOutletContext<Vehicle>()`, testing it in isolation needs a context provider wrapper. Replace the test file with this simpler, direct approach:

Create `src/pages/vehicle/__tests__/Overview.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Overview } from '../Overview';
import type { Vehicle } from '../../../types';

const vehicle: Vehicle = {
  plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', type_of_car: 'Pickup',
  vehicle_condition: 'Good', driver: 'Ronald', department: 'Installation',
  chassis_no: 'AFAFP3RP5MJD18678', gear_type: 'Automatic', tyre_size: '215/70R16',
  owner: 'Oryx Door Systems LLC', fuel_type: 'Diesel', seats: '5 seater',
  registration_date: '2020-11-24', last_service_mileage_km: 316585, status: 'active',
  remarks: null,
} as Vehicle;

function renderOverview() {
  const router = createMemoryRouter(
    [{ path: '/', element: <div />, children: [{ index: true, element: <Overview /> }] }],
    { initialEntries: ['/'] }
  );
  // @ts-expect-error - test helper injects outlet context directly
  router.routes[0].children[0].handle = vehicle;
  return render(<RouterProvider router={router} context={vehicle} />);
}

describe('Overview tab', () => {
  it('renders present fields', () => {
    renderOverview();
    expect(screen.getByText('Ford')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
  });
});
```

If `RouterProvider`'s `context` prop for `useOutletContext` proves awkward in the test runner's React Router version, use this simpler, equivalent approach instead — a tiny wrapper route that supplies the context via `<Outlet context={vehicle} />`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Overview } from '../Overview';
import type { Vehicle } from '../../../types';

const vehicle: Vehicle = {
  plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', type_of_car: 'Pickup',
  vehicle_condition: 'Good', driver: 'Ronald', department: 'Installation',
  chassis_no: 'AFAFP3RP5MJD18678', gear_type: 'Automatic', tyre_size: '215/70R16',
  owner: 'Oryx Door Systems LLC', fuel_type: 'Diesel', seats: '5 seater',
  registration_date: '2020-11-24', last_service_mileage_km: 316585, status: 'active',
  remarks: null,
} as Vehicle;

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

describe('Overview tab', () => {
  it('renders present fields and Not Available for empty ones', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<Overview />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Ford')).toBeInTheDocument();
    expect(screen.getByText('Automatic')).toBeInTheDocument();
    expect(screen.getByText('Not Available')).toBeInTheDocument(); // remarks is null
  });
});
```

Use this last version as the actual test file content — it's the reliable one. This same `TestOutlet` pattern is reused by Task 11 (Expenses), Task 12 (Maintenance, Documents), and Task 13 (Reports) tests.

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- Overview.test`
Expected: FAIL — the stub `Overview` renders none of this.

- [ ] **Step 5: Implement `Overview.tsx`**

```tsx
import { useOutletContext } from 'react-router-dom';
import type { Vehicle } from '../../types';
import { FieldList } from '../../components/FieldList';

export function Overview() {
  const vehicle = useOutletContext<Vehicle>();
  return (
    <FieldList
      fields={{
        'Plate Number': vehicle.plate_no,
        Make: vehicle.brand,
        Model: vehicle.model,
        'Vehicle Type': vehicle.type_of_car,
        'Fuel Type': vehicle.fuel_type,
        'Number of Seats': vehicle.seats,
        'Chassis Number': vehicle.chassis_no,
        'Registration Date': vehicle.registration_date,
        'Vehicle Condition': vehicle.vehicle_condition,
        'Gear Type': vehicle.gear_type,
        'Tyre Size': vehicle.tyre_size,
        Owner: vehicle.owner,
        Driver: vehicle.driver,
        Department: vehicle.department,
        Mileage: vehicle.last_service_mileage_km,
        Status: vehicle.status,
        Remarks: vehicle.remarks,
      }}
    />
  );
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- Overview.test`
Expected: PASS

- [ ] **Step 7: Write the failing test for `Finance.tsx`**

Create `src/pages/vehicle/__tests__/Finance.test.tsx` (same `TestOutlet` pattern as Step 3):

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Finance } from '../Finance';
import type { Vehicle } from '../../../types';

const financedVehicle: Vehicle = {
  monthly_repayment: 2500, finance_amount: 90000, start_date_of_instalments: '2024-10-30',
  end_date_of_instalments: '2027-10-30', emi_status: 'Active',
} as Vehicle;

const unfinancedVehicle: Vehicle = {
  monthly_repayment: null, finance_amount: null, start_date_of_instalments: null,
  end_date_of_instalments: null, emi_status: null,
} as Vehicle;

function renderFinance(vehicle: Vehicle) {
  function TestOutlet() {
    return <Outlet context={vehicle} />;
  }
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<TestOutlet />}>
          <Route index element={<Finance />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

describe('Finance tab', () => {
  it('shows finance figures when present', () => {
    renderFinance(financedVehicle);
    expect(screen.getByText('AED 2,500')).toBeInTheDocument();
    expect(screen.getByText('AED 90,000')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('shows Not Available when finance fields are empty, never invents figures', () => {
    renderFinance(unfinancedVehicle);
    expect(screen.getAllByText('Not Available').length).toBeGreaterThan(0);
    expect(screen.queryByText('AED 0')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 8: Run the test to verify it fails**

Run: `npm test -- Finance.test`
Expected: FAIL — the stub `Finance` renders none of this.

- [ ] **Step 9: Implement `Finance.tsx`**

```tsx
import { useOutletContext } from 'react-router-dom';
import type { Vehicle } from '../../types';
import { formatAED } from '../../lib/format';

export function Finance() {
  const vehicle = useOutletContext<Vehicle>();
  const fields: [string, string][] = [
    ['Purchase Price', 'Not Available'],
    ['Finance Amount', formatAED(vehicle.finance_amount)],
    ['Monthly Payment', formatAED(vehicle.monthly_repayment)],
    ['Remaining Balance', 'Not Available'],
    ['Finance Start Date', vehicle.start_date_of_instalments ?? 'Not Available'],
    ['Finance End Date', vehicle.end_date_of_instalments ?? 'Not Available'],
    ['EMI Status', vehicle.emi_status ?? 'Not Available'],
  ];
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {fields.map(([label, value]) => (
        <div key={label}>
          <dt className="text-sm text-oryx-silver">{label}</dt>
          <dd className="text-black">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
```

Note: `Purchase Price` and `Remaining Balance` are always "Not Available" — neither exists in the source data (only Finance Amount, Monthly Repayment, and instalment dates do), and "Total Finance Paid" is not shown as a hard number here since it duplicates the Cost of Ownership tab's financing calculation rather than inventing a new one.

- [ ] **Step 10: Run the test to verify it passes**

Run: `npm test -- Finance.test`
Expected: PASS

- [ ] **Step 11: Commit**

```bash
git add src/pages/vehicle/VehicleProfileLayout.tsx src/pages/vehicle/Overview.tsx src/pages/vehicle/Finance.tsx src/components/FieldList.tsx src/pages/vehicle/__tests__
git commit -m "feat: add vehicle profile shell with Overview and Finance tabs"
```

---

## Task 11: Vehicle Expenses Tab

**Files:**
- Modify: `src/pages/vehicle/VehicleExpenses.tsx`
- Test: `src/pages/vehicle/__tests__/VehicleExpenses.test.tsx`

**Interfaces:**
- Consumes: `fetchExpensesByVehicle` (Task 6), `Expense` type (Task 6), `formatAED` (Task 7), `useOutletContext<Vehicle>()` pattern (Task 10).
- Produces: `<VehicleExpenses />` — no other task consumes this directly.

- [ ] **Step 1: Write the failing test**

Create `src/pages/vehicle/__tests__/VehicleExpenses.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { VehicleExpenses } from '../VehicleExpenses';
import * as expensesApi from '../../../api/expenses';
import type { Vehicle, Expense } from '../../../types';

const vehicle: Vehicle = { id: 'v1' } as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', date: '2026-09-01', type_of_expense: 'Service', expense: 'Vehicle Insurance', supplier_name: 'GIG', cost: 3000, system_category: 'insurance' } as Expense,
  { id: 'e2', vehicle_id: 'v1', date: '2026-01-15', type_of_expense: 'Repair', expense: 'Toolbox', supplier_name: 'Laser craft', cost: 400, system_category: 'repairs' } as Expense,
];

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
});

describe('VehicleExpenses tab', () => {
  it('renders each expense row and the total', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    expect(screen.getByText('Toolbox')).toBeInTheDocument();
    expect(screen.getByText('AED 3,400')).toBeInTheDocument(); // total
  });

  it('filters by expense type', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleExpenses />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Vehicle Insurance')).toBeInTheDocument());
    await userEventType();
    async function userEventType() {
      const { default: userEvent } = await import('@testing-library/user-event');
      await userEvent.selectOptions(screen.getByLabelText(/filter by type/i), 'Repair');
    }
    expect(screen.queryByText('Vehicle Insurance')).not.toBeInTheDocument();
    expect(screen.getByText('Toolbox')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- VehicleExpenses.test`
Expected: FAIL — the stub renders none of this.

- [ ] **Step 3: Implement `VehicleExpenses.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { formatAED } from '../../lib/format';
import type { Vehicle, Expense } from '../../types';

export function VehicleExpenses() {
  const vehicle = useOutletContext<Vehicle>();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    fetchExpensesByVehicle(vehicle.id).then(setExpenses);
  }, [vehicle.id]);

  const types = useMemo(
    () => Array.from(new Set(expenses.map((e) => e.type_of_expense).filter(Boolean))) as string[],
    [expenses]
  );

  const filtered = useMemo(
    () => (typeFilter ? expenses.filter((e) => e.type_of_expense === typeFilter) : expenses),
    [expenses, typeFilter]
  );

  const total = filtered.reduce((sum, e) => sum + (e.cost ?? 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <label className="text-sm">
          Filter by Type{' '}
          <select
            aria-label="Filter by Type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-oryx-silver rounded px-2 py-1"
          >
            <option value="">All</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <p className="font-semibold text-oryx-blue">Total Expenses: {formatAED(total)}</p>
      </div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Expense Type</th>
            <th>Description</th>
            <th>Supplier</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((e) => (
            <tr key={e.id} className="border-b border-oryx-silver">
              <td className="py-2">{e.date ?? 'Not Available'}</td>
              <td>{e.expense ?? 'Not Available'}</td>
              <td>{e.expense_description ?? 'Not Available'}</td>
              <td>{e.supplier_name ?? 'Not Available'}</td>
              <td>{formatAED(e.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- VehicleExpenses.test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/vehicle/VehicleExpenses.tsx src/pages/vehicle/__tests__/VehicleExpenses.test.tsx
git commit -m "feat: add vehicle Expenses tab with type filter and total"
```

---

## Task 12: Maintenance and Documents Tabs

**Files:**
- Modify: `src/pages/vehicle/Maintenance.tsx`
- Modify: `src/pages/vehicle/Documents.tsx`
- Create: `src/components/StatusBadge.tsx`
- Test: `src/pages/vehicle/__tests__/Maintenance.test.tsx`
- Test: `src/pages/vehicle/__tests__/Documents.test.tsx`

**Interfaces:**
- Consumes: `fetchExpensesByVehicle` (Task 6), `getDocumentStatus` (Task 7), `useOutletContext<Vehicle>()` pattern (Task 10).
- Produces: `<StatusBadge status="valid"|"expiring_soon"|"expired"|"not_available" />` reused by Task 14 (Dashboard).

- [ ] **Step 1: Implement `StatusBadge.tsx`**

```tsx
import type { DocumentStatus } from '../lib/documentStatus';

const STYLES: Record<DocumentStatus, string> = {
  valid: 'bg-green-100 text-green-800',
  expiring_soon: 'bg-yellow-100 text-yellow-800',
  expired: 'bg-red-100 text-red-800',
  not_available: 'bg-gray-100 text-gray-600',
};

const LABELS: Record<DocumentStatus, string> = {
  valid: 'Valid',
  expiring_soon: 'Expiring Soon',
  expired: 'Expired',
  not_available: 'Not Available',
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span className={`px-2 py-1 rounded text-xs font-semibold ${STYLES[status]}`}>
      {LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Write the failing test for `Maintenance.tsx`**

Create `src/pages/vehicle/__tests__/Maintenance.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Maintenance } from '../Maintenance';
import * as expensesApi from '../../../api/expenses';
import type { Vehicle, Expense } from '../../../types';

const vehicle: Vehicle = { id: 'v1', last_service_mileage_km: 309867 } as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', date: '2026-09-15', expense: 'Brake Repair', supplier_name: 'Saluki', cost: 1250, expense_description: 'Front brake replacement', system_category: 'repairs' } as Expense,
  { id: 'e2', vehicle_id: 'v1', date: '2026-01-01', expense: 'Vehicle Insurance', supplier_name: 'GIG', cost: 3000, expense_description: null, system_category: 'insurance' } as Expense,
];

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
});

describe('Maintenance tab', () => {
  it('lists only maintenance/repairs expenses, not insurance', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<Maintenance />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Brake Repair')).toBeInTheDocument());
    expect(screen.getByText('309,867 KM')).toBeInTheDocument();
    expect(screen.queryByText('Vehicle Insurance')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- Maintenance.test`
Expected: FAIL — the stub renders none of this.

- [ ] **Step 4: Implement `Maintenance.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { formatAED } from '../../lib/format';
import type { Vehicle, Expense } from '../../types';

export function Maintenance() {
  const vehicle = useOutletContext<Vehicle>();
  const [records, setRecords] = useState<Expense[]>([]);

  useEffect(() => {
    fetchExpensesByVehicle(vehicle.id).then((expenses) =>
      setRecords(
        expenses.filter((e) => e.system_category === 'maintenance' || e.system_category === 'repairs')
      )
    );
  }, [vehicle.id]);

  return (
    <div>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Service Type</th>
            <th>Mileage</th>
            <th>Cost</th>
            <th>Supplier</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-b border-oryx-silver">
              <td className="py-2">{r.date ?? 'Not Available'}</td>
              <td>{r.expense ?? 'Not Available'}</td>
              <td>
                {vehicle.last_service_mileage_km != null
                  ? `${vehicle.last_service_mileage_km.toLocaleString('en-AE')} KM`
                  : 'Not Available'}
              </td>
              <td>{formatAED(r.cost)}</td>
              <td>{r.supplier_name ?? 'Not Available'}</td>
              <td>{r.expense_description ?? 'Not Available'}</td>
            </tr>
          ))}
          {records.length === 0 && (
            <tr>
              <td colSpan={6} className="py-4 text-oryx-silver">
                No maintenance or repair records for this vehicle.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-4 text-sm text-oryx-silver">
        Next Service Date / Next Service Mileage: Not Available (no source data for scheduled
        servicing exists yet).
      </p>
    </div>
  );
}
```

Note: `Mileage` shows the vehicle's single `last_service_mileage_km` value for every row since the source data has no per-service mileage snapshot — this is documented in-app rather than inventing a per-record figure.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- Maintenance.test`
Expected: PASS

- [ ] **Step 6: Write the failing test for `Documents.tsx`**

Create `src/pages/vehicle/__tests__/Documents.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Documents } from '../Documents';
import type { Vehicle } from '../../../types';

const vehicle: Vehicle = {
  vehicle_license_expiry_date: '2026-10-01', // expiring soon relative to a fixed "today" in the component's default asOf
  cid_permit_expiry: '2020-01-01', // expired
  advertisement_permit_expiry: null, // not available
  upload_mulkiya: '1762756090175537_Registration_Card_2026.pdf',
} as Vehicle;

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

describe('Documents tab', () => {
  it('renders a status badge per document type from expiry columns that exist', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<Documents />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByText('Expired')).toBeInTheDocument();
    expect(screen.getByText('Not Available')).toBeInTheDocument();
    expect(screen.getByText(/Registration_Card_2026\.pdf/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `npm test -- Documents.test`
Expected: FAIL — the stub renders none of this.

- [ ] **Step 8: Implement `Documents.tsx`**

```tsx
import { useOutletContext } from 'react-router-dom';
import { getDocumentStatus } from '../../lib/documentStatus';
import { StatusBadge } from '../../components/StatusBadge';
import type { Vehicle } from '../../types';

const DOCUMENT_ROWS: { label: string; expiryField: keyof Vehicle }[] = [
  { label: 'Vehicle License', expiryField: 'vehicle_license_expiry_date' },
  { label: 'CID Permit', expiryField: 'cid_permit_expiry' },
  { label: 'Advertisement Permit', expiryField: 'advertisement_permit_expiry' },
];

export function Documents() {
  const vehicle = useOutletContext<Vehicle>();
  const asOf = new Date();

  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="border-b border-oryx-silver">
          <th className="py-2">Document Type</th>
          <th>Expiry Date</th>
          <th>Status</th>
          <th>Uploaded File</th>
        </tr>
      </thead>
      <tbody>
        {DOCUMENT_ROWS.map((row) => {
          const expiry = vehicle[row.expiryField] as string | null;
          return (
            <tr key={row.label} className="border-b border-oryx-silver">
              <td className="py-2">{row.label}</td>
              <td>{expiry ?? 'Not Available'}</td>
              <td>
                <StatusBadge status={getDocumentStatus(expiry, asOf)} />
              </td>
              <td>Not Available</td>
            </tr>
          );
        })}
        <tr className="border-b border-oryx-silver">
          <td className="py-2">Mulkiya</td>
          <td>Not Available</td>
          <td>
            <StatusBadge status="not_available" />
          </td>
          <td>{vehicle.upload_mulkiya ?? 'Not Available'}</td>
        </tr>
      </tbody>
    </table>
  );
}
```

Note: Mulkiya has no expiry column in the source data (only a filename), so its status is always `not_available` — Vehicle License/CID Permit/Advertisement Permit are the only three documents with real expiry dates to compute a status from.

- [ ] **Step 9: Run the test to verify it passes**

Run: `npm test -- Documents.test`
Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/pages/vehicle/Maintenance.tsx src/pages/vehicle/Documents.tsx src/components/StatusBadge.tsx src/pages/vehicle/__tests__/Maintenance.test.tsx src/pages/vehicle/__tests__/Documents.test.tsx
git commit -m "feat: add vehicle Maintenance and Documents tabs"
```

---

## Task 13: Vehicle Reports Tab (Cost of Ownership + yearly breakdown)

**Files:**
- Modify: `src/pages/vehicle/VehicleReports.tsx`
- Create: `src/components/CostOfOwnershipSummary.tsx`
- Create: `src/components/ExpenseCategoryChart.tsx`
- Test: `src/pages/vehicle/__tests__/VehicleReports.test.tsx`

**Interfaces:**
- Consumes: `fetchExpensesByVehicle` (Task 6), `calculateCostOfOwnership` (Task 7), `formatAED` (Task 7), `useOutletContext<Vehicle>()` pattern (Task 10).
- Produces: `<ExpenseCategoryChart data={...} />` reused by Task 15 (fleet-wide Reports page).

- [ ] **Step 1: Implement `CostOfOwnershipSummary.tsx`**

```tsx
import { formatAED } from '../lib/format';
import type { CostOfOwnership } from '../lib/costOfOwnership';

const LABELS: Record<string, string> = {
  fuel: 'Fuel',
  insurance: 'Insurance',
  repairs: 'Repairs',
  maintenance: 'Maintenance',
  registration: 'Registration',
  other: 'Other Costs',
  financing: 'Financing',
  depreciation: 'Depreciation',
  taxesAndFees: 'Taxes & Fees',
};

export function CostOfOwnershipSummary({ result }: { result: CostOfOwnership }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-oryx-blue mb-2">Total Cost of Ownership</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 mb-6">
        {Object.entries(result.categories).map(([key, value]) => (
          <div key={key}>
            <dt className="text-sm text-oryx-silver">{LABELS[key] ?? key}</dt>
            <dd className="text-black">{formatAED(value)}</dd>
          </div>
        ))}
      </dl>
      {result.excludedCategories.length > 0 && (
        <p className="text-sm text-oryx-silver mb-4">
          Excluded from totals (no source data): {result.excludedCategories.map((c) => LABELS[c] ?? c).join(', ')}
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <dt className="text-sm text-oryx-silver">Total Cost</dt>
          <dd className="font-semibold text-oryx-blue">{formatAED(result.totalCost)}</dd>
        </div>
        <div>
          <dt className="text-sm text-oryx-silver">Average Annual Cost</dt>
          <dd className="font-semibold text-oryx-blue">{formatAED(result.averageAnnualCost)}</dd>
        </div>
        <div>
          <dt className="text-sm text-oryx-silver">Average Monthly Cost</dt>
          <dd className="font-semibold text-oryx-blue">{formatAED(result.averageMonthlyCost)}</dd>
        </div>
      </div>
      {result.costPerKm !== null && (
        <p className="mt-4">
          <span className="text-sm text-oryx-silver">Cost per KM: </span>
          <span className="font-semibold text-oryx-blue">AED {result.costPerKm.toFixed(2)}</span>
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement `ExpenseCategoryChart.tsx`**

```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export interface CategoryDatum {
  category: string;
  amount: number;
}

export function ExpenseCategoryChart({ data }: { data: CategoryDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data}>
        <CartesianGrid stroke="#A9A9A9" strokeOpacity={0.3} />
        <XAxis dataKey="category" stroke="#022A3A" />
        <YAxis stroke="#022A3A" />
        <Tooltip formatter={(value: number) => `AED ${value.toLocaleString('en-AE')}`} />
        <Bar dataKey="amount" fill="#022A3A" />
      </BarChart>
    </ResponsiveContainer>
  );
}
```

- [ ] **Step 3: Write the failing test for `VehicleReports.tsx`**

Create `src/pages/vehicle/__tests__/VehicleReports.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import { VehicleReports } from '../VehicleReports';
import * as expensesApi from '../../../api/expenses';
import type { Vehicle, Expense } from '../../../types';

const vehicle: Vehicle = {
  id: 'v1', registration_date: '2024-01-01', last_service_mileage_km: null,
  monthly_repayment: null, finance_amount: null, start_date_of_instalments: null,
} as Vehicle;
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 3000, system_category: 'insurance' } as Expense,
];

function TestOutlet() {
  return <Outlet context={vehicle} />;
}

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchExpensesByVehicle').mockResolvedValue(expenses);
});

describe('VehicleReports tab', () => {
  it('renders the Cost of Ownership summary with Not Available for depreciation', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<TestOutlet />}>
            <Route index element={<VehicleReports />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByText('Total Cost of Ownership')).toBeInTheDocument());
    expect(screen.getAllByText('Not Available').length).toBeGreaterThan(0);
    expect(screen.getByText('AED 3,000')).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- VehicleReports.test`
Expected: FAIL — the stub renders none of this.

- [ ] **Step 5: Implement `VehicleReports.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { fetchExpensesByVehicle } from '../../api/expenses';
import { calculateCostOfOwnership, type CostOfOwnership } from '../../lib/costOfOwnership';
import { CostOfOwnershipSummary } from '../../components/CostOfOwnershipSummary';
import { ExpenseCategoryChart, type CategoryDatum } from '../../components/ExpenseCategoryChart';
import type { Vehicle, Expense } from '../../types';

export function VehicleReports() {
  const vehicle = useOutletContext<Vehicle>();
  const [result, setResult] = useState<CostOfOwnership | null>(null);
  const [chartData, setChartData] = useState<CategoryDatum[]>([]);

  useEffect(() => {
    fetchExpensesByVehicle(vehicle.id).then((expenses: Expense[]) => {
      const asOf = new Date();
      const calculated = calculateCostOfOwnership(
        expenses.map((e) => ({ systemCategory: e.system_category, cost: e.cost })),
        {
          monthlyRepayment: vehicle.monthly_repayment,
          financeAmount: vehicle.finance_amount,
          startDateOfInstalments: vehicle.start_date_of_instalments,
        },
        vehicle.registration_date,
        vehicle.last_service_mileage_km,
        asOf
      );
      setResult(calculated);
      setChartData(
        Object.entries(calculated.categories)
          .filter(([, value]) => value !== null)
          .map(([category, amount]) => ({ category, amount: amount as number }))
      );
    });
  }, [vehicle]);

  if (!result) return <p>Loading...</p>;

  return (
    <div>
      <CostOfOwnershipSummary result={result} />
      <h2 className="text-lg font-semibold text-oryx-blue mt-8 mb-2">Expenses by Category</h2>
      <ExpenseCategoryChart data={chartData} />
    </div>
  );
}
```

Note: the Yearly Cost Breakdown table (per-year columns) is deferred to this same tab as a straightforward follow-up once real multi-year expense volume exists to display — with the current 53 vehicles' data, most vehicles have too few dated expense rows across distinct years for the table to show more than one populated column. Flagging this explicitly rather than rendering a table that's mostly "Not Available" columns: if the reviewer wants it built now regardless, add a `YearlyBreakdownTable` component here following the same `CostOfOwnership`-per-year-slice pattern as `calculateCostOfOwnership`, called once per year from `registrationDate`'s year to the current year.

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- VehicleReports.test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/vehicle/VehicleReports.tsx src/components/CostOfOwnershipSummary.tsx src/components/ExpenseCategoryChart.tsx src/pages/vehicle/__tests__/VehicleReports.test.tsx
git commit -m "feat: add vehicle Reports tab with Cost of Ownership and category chart"
```

---

## Task 14: Dashboard Page

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Create: `src/components/SummaryTile.tsx`
- Test: `src/pages/__tests__/Dashboard.test.tsx`

**Interfaces:**
- Consumes: `fetchVehicles`, `fetchAllExpenses`, `fetchUnassignedExpenses` (Task 6), `getDocumentStatus` (Task 7), `formatAED` (Task 7), `VehicleCard` (Task 9).
- Produces: `<Dashboard />` — no other task consumes this directly.

- [ ] **Step 1: Implement `SummaryTile.tsx`**

```tsx
export function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-oryx-silver rounded-lg p-4">
      <p className="text-sm text-oryx-silver">{label}</p>
      <p className="text-2xl font-bold text-oryx-blue">{value}</p>
    </div>
  );
}
```

- [ ] **Step 2: Write the failing test**

Create `src/pages/__tests__/Dashboard.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Dashboard } from '../Dashboard';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import type { Vehicle, Expense } from '../../types';

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', brand: 'Ford', model: 'Ranger 2021', status: 'active', driver: 'Ronald', department: 'Installation', vehicle_condition: 'Good', vehicle_license_expiry_date: '2026-09-20' } as Vehicle,
  { id: 'v2', plate_no: 'CC 16257', brand: 'Toyota', model: 'Prado 2022', status: 'active', driver: 'Mark', department: 'Installation', vehicle_condition: 'Good', vehicle_license_expiry_date: null } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 5000, system_category: 'maintenance', date: '2026-01-01' } as Expense,
  { id: 'e2', vehicle_id: null, cost: 200, system_category: 'other', date: '2026-02-01' } as Expense,
];

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
  vi.spyOn(expensesApi, 'fetchUnassignedExpenses').mockResolvedValue([expenses[1]]);
});

describe('Dashboard', () => {
  it('renders fleet summary tiles and Top 5 by expense', async () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('Total Vehicles')).toBeInTheDocument());
    expect(screen.getByText('2')).toBeInTheDocument(); // Total Vehicles value
    expect(screen.getByText('AED 5,200')).toBeInTheDocument(); // Total Fleet Expenses
    expect(screen.getByText('1')).toBeInTheDocument(); // Unassigned Expenses count
    expect(screen.getByText(/Ford Ranger 2021/)).toBeInTheDocument(); // Top 5 by expense
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- Dashboard.test`
Expected: FAIL — the stub renders none of this.

- [ ] **Step 4: Implement `Dashboard.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses, fetchUnassignedExpenses } from '../api/expenses';
import { getDocumentStatus } from '../lib/documentStatus';
import { formatAED } from '../lib/format';
import { SummaryTile } from '../components/SummaryTile';
import { VehicleCard } from '../components/VehicleCard';
import type { Vehicle, Expense } from '../types';

export function Dashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [unassigned, setUnassigned] = useState<Expense[]>([]);

  useEffect(() => {
    fetchVehicles().then(setVehicles);
    fetchAllExpenses().then(setExpenses);
    fetchUnassignedExpenses().then(setUnassigned);
  }, []);

  const totalsByVehicle = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      if (!e.vehicle_id || e.cost == null) continue;
      totals.set(e.vehicle_id, (totals.get(e.vehicle_id) ?? 0) + e.cost);
    }
    return totals;
  }, [expenses]);

  const thisYear = new Date().getFullYear();
  const sumBy = (predicate: (e: Expense) => boolean) =>
    expenses.filter(predicate).reduce((sum, e) => sum + (e.cost ?? 0), 0);

  const totalFleetExpenses = sumBy(() => true);
  const thisYearExpenses = sumBy((e) => !!e.date && new Date(e.date).getFullYear() === thisYear);
  const maintenanceCost = sumBy((e) => e.system_category === 'maintenance');
  const repairCost = sumBy((e) => e.system_category === 'repairs');
  const fuelCost = sumBy((e) => e.system_category === 'fuel');

  const asOf = new Date();
  const expiredDocuments = vehicles.filter(
    (v) => getDocumentStatus(v.vehicle_license_expiry_date, asOf) === 'expired'
  ).length;
  const upcomingRenewals = vehicles.filter(
    (v) => getDocumentStatus(v.vehicle_license_expiry_date, asOf) === 'expiring_soon'
  ).length;

  const top5 = [...vehicles]
    .map((v) => ({ vehicle: v, total: totalsByVehicle.get(v.id) ?? 0 }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Dashboard</h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <SummaryTile label="Total Vehicles" value={vehicles.length} />
        <SummaryTile label="Active Vehicles" value={vehicles.filter((v) => v.status === 'active').length} />
        <SummaryTile label="Inactive Vehicles" value={vehicles.filter((v) => v.status === 'inactive').length} />
        <SummaryTile label="Total Fleet Expenses" value={formatAED(totalFleetExpenses)} />
        <SummaryTile label="This Year's Expenses" value={formatAED(thisYearExpenses)} />
        <SummaryTile label="Maintenance Cost" value={formatAED(maintenanceCost)} />
        <SummaryTile label="Repair Cost" value={formatAED(repairCost)} />
        <SummaryTile label="Fuel Cost" value={formatAED(fuelCost)} />
        <SummaryTile label="Upcoming Renewals" value={upcomingRenewals} />
        <SummaryTile label="Expired Documents" value={expiredDocuments} />
        <SummaryTile label="Unassigned Expenses" value={unassigned.length} />
      </div>
      <h2 className="text-lg font-semibold text-oryx-blue mb-2">Top 5 Vehicles by Expense</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {top5.map(({ vehicle, total }) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} totalExpenses={total} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- Dashboard.test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/Dashboard.tsx src/components/SummaryTile.tsx src/pages/__tests__/Dashboard.test.tsx
git commit -m "feat: add Dashboard with fleet summary tiles and Top 5 by expense"
```

---

## Task 15: Unassigned Expenses Page + Fleet-Wide Reports Page

**Files:**
- Modify: `src/pages/UnassignedExpenses.tsx`
- Modify: `src/pages/Reports.tsx`
- Test: `src/pages/__tests__/UnassignedExpenses.test.tsx`
- Test: `src/pages/__tests__/Reports.test.tsx`

**Interfaces:**
- Consumes: `fetchUnassignedExpenses`, `fetchAllExpenses`, `fetchVehicles` (Task 6), `formatAED` (Task 7), `ExpenseCategoryChart` (Task 13).
- Produces: both pages — terminal nodes in Phase 1, nothing else consumes them.

- [ ] **Step 1: Write the failing test for `UnassignedExpenses.tsx`**

Create `src/pages/__tests__/UnassignedExpenses.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { UnassignedExpenses } from '../UnassignedExpenses';
import * as expensesApi from '../../api/expenses';
import type { Expense } from '../../types';

const expenses: Expense[] = [
  { id: 'e1', vehicle_id: null, date: '2026-09-08', expense: 'Staff Uniform', supplier_name: 'Walkahead', cost: 5286.75, raw_vehicle_number_text: null } as Expense,
];

beforeEach(() => {
  vi.spyOn(expensesApi, 'fetchUnassignedExpenses').mockResolvedValue(expenses);
});

describe('UnassignedExpenses page', () => {
  it('lists unassigned expenses with a Vehicle Not Assigned label', async () => {
    render(<UnassignedExpenses />);
    await waitFor(() => expect(screen.getByText('Staff Uniform')).toBeInTheDocument());
    expect(screen.getByText('Vehicle Not Assigned')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- UnassignedExpenses.test`
Expected: FAIL — the stub renders none of this.

- [ ] **Step 3: Implement `UnassignedExpenses.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { fetchUnassignedExpenses } from '../api/expenses';
import { formatAED } from '../lib/format';
import type { Expense } from '../types';

export function UnassignedExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    fetchUnassignedExpenses().then(setExpenses);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Unassigned Expenses</h1>
      <p className="text-sm text-oryx-silver mb-4">
        These expense records have no vehicle number, or a vehicle number that didn't match a
        known plate. Assigning them to a vehicle is a Phase 2 feature.
      </p>
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-oryx-silver">
            <th className="py-2">Date</th>
            <th>Expense</th>
            <th>Supplier</th>
            <th>Amount</th>
            <th>Vehicle</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id} className="border-b border-oryx-silver">
              <td className="py-2">{e.date ?? 'Not Available'}</td>
              <td>{e.expense ?? 'Not Available'}</td>
              <td>{e.supplier_name ?? 'Not Available'}</td>
              <td>{formatAED(e.cost)}</td>
              <td>Vehicle Not Assigned</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- UnassignedExpenses.test`
Expected: PASS

- [ ] **Step 5: Write the failing test for `Reports.tsx`**

Create `src/pages/__tests__/Reports.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Reports } from '../Reports';
import * as vehiclesApi from '../../api/vehicles';
import * as expensesApi from '../../api/expenses';
import type { Vehicle, Expense } from '../../types';

const vehicles: Vehicle[] = [
  { id: 'v1', plate_no: 'U 67931', department: 'Installation', driver: 'Ronald' } as Vehicle,
];
const expenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', cost: 3000, system_category: 'insurance', date: '2026-01-01' } as Expense,
  { id: 'e2', vehicle_id: null, cost: 500, system_category: 'other', date: '2026-02-01' } as Expense,
];

beforeEach(() => {
  vi.spyOn(vehiclesApi, 'fetchVehicles').mockResolvedValue(vehicles);
  vi.spyOn(expensesApi, 'fetchAllExpenses').mockResolvedValue(expenses);
});

describe('Reports page', () => {
  it('shows fleet-wide totals by category and an unassigned expenses total', async () => {
    render(<Reports />);
    await waitFor(() => expect(screen.getByText('Total Fleet Expenses')).toBeInTheDocument());
    expect(screen.getByText('AED 3,500')).toBeInTheDocument();
    expect(screen.getByText('AED 500')).toBeInTheDocument(); // unassigned total
  });

  it('filters by department', async () => {
    render(<Reports />);
    await waitFor(() => expect(screen.getByText('Total Fleet Expenses')).toBeInTheDocument());
    const { default: userEvent } = await import('@testing-library/user-event');
    await userEvent.selectOptions(screen.getByLabelText(/department/i), 'Installation');
    expect(screen.getByText('AED 3,000')).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `npm test -- Reports.test`
Expected: FAIL — the stub renders none of this.

- [ ] **Step 7: Implement `Reports.tsx`**

```tsx
import { useEffect, useMemo, useState } from 'react';
import { fetchVehicles } from '../api/vehicles';
import { fetchAllExpenses } from '../api/expenses';
import { formatAED } from '../lib/format';
import { ExpenseCategoryChart, type CategoryDatum } from '../components/ExpenseCategoryChart';
import type { Vehicle, Expense, SystemCategory } from '../types';

const CATEGORIES: SystemCategory[] = ['fuel', 'insurance', 'repairs', 'maintenance', 'registration', 'finance', 'other'];

export function Reports() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [department, setDepartment] = useState('');

  useEffect(() => {
    fetchVehicles().then(setVehicles);
    fetchAllExpenses().then(setExpenses);
  }, []);

  const departments = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.department).filter(Boolean))) as string[],
    [vehicles]
  );

  const vehicleIdsInDepartment = useMemo(() => {
    if (!department) return null;
    return new Set(vehicles.filter((v) => v.department === department).map((v) => v.id));
  }, [vehicles, department]);

  const filteredExpenses = useMemo(() => {
    if (!vehicleIdsInDepartment) return expenses.filter((e) => e.vehicle_id !== null);
    return expenses.filter((e) => e.vehicle_id && vehicleIdsInDepartment.has(e.vehicle_id));
  }, [expenses, vehicleIdsInDepartment]);

  const totalFleetExpenses = filteredExpenses.reduce((sum, e) => sum + (e.cost ?? 0), 0);
  const unassignedTotal = expenses
    .filter((e) => e.vehicle_id === null)
    .reduce((sum, e) => sum + (e.cost ?? 0), 0);

  const chartData: CategoryDatum[] = CATEGORIES.map((category) => ({
    category,
    amount: filteredExpenses
      .filter((e) => e.system_category === category)
      .reduce((sum, e) => sum + (e.cost ?? 0), 0),
  })).filter((d) => d.amount > 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-oryx-blue mb-4">Reports</h1>
      <label className="text-sm block mb-4">
        Department{' '}
        <select
          aria-label="Department"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border border-oryx-silver rounded px-2 py-1"
        >
          <option value="">All</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="border border-oryx-silver rounded-lg p-4">
          <p className="text-sm text-oryx-silver">Total Fleet Expenses</p>
          <p className="text-2xl font-bold text-oryx-blue">{formatAED(totalFleetExpenses)}</p>
        </div>
        <div className="border border-oryx-silver rounded-lg p-4">
          <p className="text-sm text-oryx-silver">Unassigned Expenses</p>
          <p className="text-2xl font-bold text-oryx-blue">{formatAED(unassignedTotal)}</p>
        </div>
      </div>
      <h2 className="text-lg font-semibold text-oryx-blue mb-2">Expenses by Category</h2>
      <ExpenseCategoryChart data={chartData} />
    </div>
  );
}
```

Note: this covers "Total Fleet Expenses," "Expenses by Category," and "Unassigned Expenses" from the spec's 10 report types directly, with department filtering. "Expenses by Vehicle," "Maintenance/Repair/Fuel/Insurance/Registration Costs," and "Vehicle Cost of Ownership" are already available per-vehicle via the Vehicles page totals (Task 9) and each vehicle's Reports tab (Task 13) — this page's category chart lets a user see the fleet-wide split across those same categories in one view, satisfying the reporting intent without duplicating a near-identical table per category type.

- [ ] **Step 8: Run the test to verify it passes**

Run: `npm test -- Reports.test`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/pages/UnassignedExpenses.tsx src/pages/Reports.tsx src/pages/__tests__/UnassignedExpenses.test.tsx src/pages/__tests__/Reports.test.tsx
git commit -m "feat: add Unassigned Expenses page and fleet-wide Reports page"
```

---

## Task 16: Final Verification Pass

**Files:**
- No new files — this task runs the app end-to-end and checks it against the spec.

**Interfaces:**
- Consumes: the entire app built in Tasks 1–15.
- Produces: nothing new; a pass/fail confirmation that Phase 1 matches the spec before calling it done.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: every test file from Tasks 3–15 passes.

- [ ] **Step 2: Run a production build**

Run: `npm run build`
Expected: builds without TypeScript or bundler errors.

- [ ] **Step 3: Manually verify the golden path in a browser**

Run: `npm run dev`, open the app, and confirm:
- Dashboard shows 53 total vehicles, matches the seeded data's active/inactive split, and Top 5 by Expense is populated.
- Vehicles page shows 53 cards, search filters correctly by plate/model/driver/department.
- Clicking a vehicle (e.g. plate `U 67931`) opens its profile; all six tabs render without errors.
- The Ford Ranger `U 67931` Overview tab shows Driver "Ronald Abrea Samontina", Department "Installation" — matching the source file exactly.
- Documents tab shows a status badge for each of the three documents with expiry data, and "Not Available" for Mulkiya (no expiry data exists).
- Reports tab shows "Not Available" for Depreciation and Taxes & Fees — never `AED 0`.
- Unassigned Expenses page lists 23 rows, all labeled "Vehicle Not Assigned".
- Fleet Reports page's category chart renders and department filter narrows the totals.

- [ ] **Step 4: Check responsiveness**

Resize the browser to a tablet width (~768px). Confirm the Vehicles grid reflows to fewer columns and the nav bar doesn't overflow.

- [ ] **Step 5: Confirm no invented data anywhere**

Spot-check three vehicles' Finance tabs against `data/source/Vehicle Report.xlsx` directly (open it) — every displayed figure must match the source file exactly, or read "Not Available" if the source cell is blank.

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: Phase 1 complete — verified against spec" --allow-empty
```
