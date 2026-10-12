import type { FieldGroup } from './recordForm';

// Every editable vehicle column, grouped as on the form. upload_* (Uploads
// sub-project), source_id (import provenance) and created_at are left out.
export const VEHICLE_FIELD_GROUPS: FieldGroup[] = [
  {
    title: 'Vehicle',
    fields: [
      { name: 'plate_no', label: 'Plate Number', type: 'text', required: true },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        required: true,
        options: [
          { value: 'active', label: 'Active' },
          { value: 'inactive', label: 'Inactive' },
        ],
      },
      { name: 'brand', label: 'Make', type: 'text' },
      { name: 'model', label: 'Model', type: 'text' },
      { name: 'type_of_car', label: 'Vehicle Type', type: 'text' },
      { name: 'fuel_type', label: 'Fuel Type', type: 'text' },
      { name: 'seats', label: 'Number of Seats', type: 'text' },
      { name: 'chassis_no', label: 'Chassis Number', type: 'text' },
      { name: 'gear_type', label: 'Gear Type', type: 'text' },
      { name: 'tyre_size', label: 'Tyre Size', type: 'text' },
      { name: 'registration_date', label: 'Registration Date', type: 'date' },
      { name: 'vehicle_condition', label: 'Vehicle Condition', type: 'text' },
      { name: 'purchase_condition', label: 'Purchase Condition', type: 'text' },
    ],
  },
  {
    title: 'Assignment',
    fields: [
      { name: 'driver', label: 'Driver', type: 'text' },
      { name: 'department', label: 'Department', type: 'text' },
      { name: 'owner', label: 'Owner', type: 'text' },
    ],
  },
  {
    title: 'Documents',
    fields: [
      { name: 'vehicle_license_expiry_date', label: 'Vehicle License Expiry', type: 'date' },
      { name: 'renewal_status', label: 'Renewal Status', type: 'text' },
      { name: 'cid_permit_start', label: 'CID Permit Start', type: 'date' },
      { name: 'cid_permit_expiry', label: 'CID Permit Expiry', type: 'date' },
      { name: 'advertisement_permit_start', label: 'Advertisement Permit Start', type: 'date' },
      { name: 'advertisement_permit_expiry', label: 'Advertisement Permit Expiry', type: 'date' },
      { name: 'branded', label: 'Branded', type: 'text' },
    ],
  },
  {
    title: 'Service',
    fields: [
      { name: 'last_service_mileage_km', label: 'Last Service Mileage (KM)', type: 'number', min: 0 },
      { name: 'warranty_year_km', label: 'Warranty (Year/KM)', type: 'text' },
      { name: 'free_service', label: 'Free Service', type: 'text' },
      { name: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },
  {
    title: 'Finance',
    fields: [
      { name: 'finance_amount', label: 'Finance Amount (AED)', type: 'number', min: 0 },
      { name: 'monthly_repayment', label: 'Monthly Repayment (AED)', type: 'number', min: 0 },
      { name: 'flat_rate', label: 'Flat Rate', type: 'number', min: 0 },
      { name: 'start_date_of_instalments', label: 'Instalments Start', type: 'date' },
      { name: 'end_date_of_instalments', label: 'Instalments End', type: 'date' },
      { name: 'instalment_in_months', label: 'Instalments (Months)', type: 'number', min: 0 },
      { name: 'instalment_in_years', label: 'Instalments (Years)', type: 'number', min: 0 },
      { name: 'emi_status', label: 'EMI Status', type: 'text' },
    ],
  },
];
