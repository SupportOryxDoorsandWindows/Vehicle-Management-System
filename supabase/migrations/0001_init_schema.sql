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
