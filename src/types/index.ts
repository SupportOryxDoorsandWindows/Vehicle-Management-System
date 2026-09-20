import type { SystemCategory } from '../../scripts/import/categorize';

export type { SystemCategory };

export interface Profile {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  active: boolean;
  created_at: string;
  updated_at: string;
}

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
