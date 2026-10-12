import type { FieldGroup } from './recordForm';
import type { SystemCategory, Vehicle } from '../types';

export const SYSTEM_CATEGORIES: { value: SystemCategory; label: string }[] = [
  { value: 'fuel', label: 'Fuel' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'repairs', label: 'Repairs' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'registration', label: 'Registration' },
  { value: 'finance', label: 'Finance' },
  { value: 'other', label: 'Other' },
];

export function vehicleOptionLabel(v: Pick<Vehicle, 'plate_no' | 'brand' | 'model'>): string {
  const name = [v.brand, v.model].filter(Boolean).join(' ');
  return name ? `${v.plate_no} — ${name}` : v.plate_no;
}

// Every editable expense column, grouped as on the form. File fields (Uploads
// sub-project) and raw_vehicle_number_text (the spreadsheet's original text,
// kept as evidence) are left out.
export function expenseFieldGroups(vehicles: Vehicle[]): FieldGroup[] {
  return [
    {
      title: 'Expense',
      fields: [
        {
          name: 'vehicle_id',
          label: 'Vehicle',
          type: 'select',
          options: [
            { value: '', label: 'Not assigned' },
            ...vehicles.map((v) => ({ value: v.id, label: vehicleOptionLabel(v) })),
          ],
        },
        { name: 'date', label: 'Date', type: 'date' },
        { name: 'expense', label: 'Expense', type: 'text' },
        { name: 'type_of_expense', label: 'Type of Expense', type: 'text' },
        { name: 'system_category', label: 'Category', type: 'select', required: true, options: SYSTEM_CATEGORIES },
        { name: 'cost', label: 'Cost (AED)', type: 'number', min: 0 },
        { name: 'supplier_name', label: 'Supplier', type: 'text' },
        { name: 'expense_description', label: 'Description', type: 'textarea' },
      ],
    },
    {
      title: 'Approval & Payment',
      fields: [
        { name: 'job_status', label: 'Job Status', type: 'text' },
        { name: 'payment_terms', label: 'Payment Terms', type: 'text' },
        { name: 'quotation_number', label: 'Quotation Number', type: 'text' },
        { name: 'invoice_number', label: 'Invoice Number', type: 'text' },
        { name: 'requested_by', label: 'Requested By', type: 'text' },
        { name: 'approved_rejected_by', label: 'Approved/Rejected By', type: 'text' },
        { name: 'approval_date', label: 'Approval Date', type: 'date' },
        { name: 'paid_by', label: 'Paid By', type: 'text' },
        { name: 'payment_date', label: 'Payment Date', type: 'date' },
      ],
    },
    {
      title: 'People & Reference',
      fields: [
        { name: 'oryx_employees', label: 'Oryx Employees', type: 'text' },
        { name: 'teams', label: 'Teams', type: 'text' },
        { name: 'grouped_expense_reference', label: 'Grouped Expense Reference', type: 'text' },
      ],
    },
  ];
}
