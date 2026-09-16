import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildSeedData } from './buildSeedData';
import { buildInsertSql } from './toSql';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
