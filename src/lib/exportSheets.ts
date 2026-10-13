import { buildSheet, type ExportColumn, type ExportSheet } from './exportExcel';
import type { Expense, Vehicle } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  fuel: 'Fuel',
  insurance: 'Insurance',
  repairs: 'Repairs',
  maintenance: 'Maintenance',
  registration: 'Registration',
  finance: 'Finance',
  other: 'Other',
};

export function vehicleRegisterSheet(vehicles: Vehicle[], totalsByVehicle: Map<string, number>): ExportSheet {
  const columns: ExportColumn<Vehicle>[] = [
    { header: 'Plate', value: (v) => v.plate_no, width: 14 },
    { header: 'Make', value: (v) => v.brand },
    { header: 'Model', value: (v) => v.model },
    { header: 'Vehicle Type', value: (v) => v.type_of_car },
    { header: 'Driver', value: (v) => v.driver },
    { header: 'Department', value: (v) => v.department },
    { header: 'Owner', value: (v) => v.owner },
    { header: 'Status', value: (v) => v.status, width: 10 },
    { header: 'Condition', value: (v) => v.vehicle_condition },
    { header: 'Registration Date', kind: 'date', value: (v) => v.registration_date, width: 16 },
    { header: 'Vehicle License Expiry', kind: 'date', value: (v) => v.vehicle_license_expiry_date, width: 20 },
    { header: 'CID Permit Expiry', kind: 'date', value: (v) => v.cid_permit_expiry, width: 16 },
    { header: 'Advertisement Permit Expiry', kind: 'date', value: (v) => v.advertisement_permit_expiry, width: 24 },
    { header: 'Last Service Mileage (KM)', kind: 'number', value: (v) => v.last_service_mileage_km, width: 22 },
    { header: 'Total Expenses (AED)', kind: 'money', value: (v) => totalsByVehicle.get(v.id) ?? 0, width: 18 },
  ];
  return buildSheet('Vehicles', columns, vehicles);
}

/** Expenses with an optional Vehicle column (plate), for sheets spanning several vehicles. */
export function expensesSheet(name: string, expenses: Expense[], plateById?: Map<string, string>): ExportSheet {
  const columns: ExportColumn<Expense>[] = [
    { header: 'Date', kind: 'date', value: (e) => e.date },
    ...(plateById
      ? [{ header: 'Vehicle', value: (e: Expense) => (e.vehicle_id ? plateById.get(e.vehicle_id) : 'Not assigned') }]
      : []),
    { header: 'Expense', value: (e) => e.expense, width: 28 },
    { header: 'Type of Expense', value: (e) => e.type_of_expense },
    { header: 'Category', value: (e) => CATEGORY_LABELS[e.system_category] ?? e.system_category, width: 14 },
    { header: 'Description', value: (e) => e.expense_description, width: 36 },
    { header: 'Supplier', value: (e) => e.supplier_name },
    { header: 'Cost (AED)', kind: 'money', value: (e) => e.cost },
    { header: 'Job Status', value: (e) => e.job_status, width: 14 },
    { header: 'Invoice Number', value: (e) => e.invoice_number, width: 16 },
    { header: 'Quotation Number', value: (e) => e.quotation_number, width: 16 },
    { header: 'Requested By', value: (e) => e.requested_by },
    { header: 'Approved/Rejected By', value: (e) => e.approved_rejected_by },
    { header: 'Paid By', value: (e) => e.paid_by },
    { header: 'Payment Date', kind: 'date', value: (e) => e.payment_date },
  ];
  return buildSheet(name, columns, expenses);
}

export interface FleetReport {
  department: string;
  totalFleetExpenses: number;
  unassignedTotal: number;
  categories: { category: string; amount: number }[];
  expenses: Expense[];
  vehicles: Vehicle[];
}

export function fleetReportSheets(report: FleetReport): ExportSheet[] {
  const summary = buildSheet<[string, string | number]>(
    'Summary',
    [
      { header: 'Item', value: ([label]) => label, width: 28 },
      { header: 'Value', kind: 'money', value: ([, value]) => value, width: 18 },
    ],
    [
      ['Department', report.department || 'All departments'],
      ['Total Fleet Expenses (AED)', report.totalFleetExpenses],
      ['Unassigned Expenses (AED)', report.unassignedTotal],
    ]
  );
  const byCategory = buildSheet<{ category: string; amount: number }>(
    'By Category',
    [
      { header: 'Category', value: (c) => CATEGORY_LABELS[c.category] ?? c.category },
      { header: 'Amount (AED)', kind: 'money', value: (c) => c.amount },
    ],
    report.categories
  );
  const plateById = new Map(report.vehicles.map((v) => [v.id, v.plate_no]));
  return [summary, byCategory, expensesSheet('Expenses', report.expenses, plateById)];
}
