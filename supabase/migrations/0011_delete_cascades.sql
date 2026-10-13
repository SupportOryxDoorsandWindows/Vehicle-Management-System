-- Lets admins delete vehicles and expenses (see
-- docs/superpowers/specs/2026-10-13-service-log-and-deletes-design.md).
-- Kept separate from 0010 because it drops and re-adds constraints.

-- Uploaded-document rows go with their vehicle or expense. The files stay in
-- storage under the deleted record's folder, so a mistaken delete can be restored.
alter table public.documents
  drop constraint documents_vehicle_id_fkey,
  add constraint documents_vehicle_id_fkey
    foreign key (vehicle_id) references public.vehicles(id) on delete cascade,
  drop constraint documents_expense_id_fkey,
  add constraint documents_expense_id_fkey
    foreign key (expense_id) references public.expenses(id) on delete cascade;

-- An expense's assignment history outlives it, with the expense left blank
-- (the full expense is copied to deleted_records). Same constraint name, so
-- the History page's embed keeps working.
alter table public.expense_assignment_audit
  alter column expense_id drop not null,
  drop constraint expense_assignment_audit_expense_id_fkey,
  add constraint expense_assignment_audit_expense_id_fkey
    foreign key (expense_id) references public.expenses(id) on delete set null;

-- Unchanged on purpose: expenses.vehicle_id and the history's vehicle columns
-- still block deleting a vehicle that has expenses or assignment history.
