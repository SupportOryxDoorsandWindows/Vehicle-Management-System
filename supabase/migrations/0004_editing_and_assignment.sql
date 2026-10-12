-- Phase 2 sub-project 2: editing & expense assignment.
-- See docs/superpowers/specs/2026-10-12-editing-and-assignment-design.md

-- Phase 1 ids came from the import script; rows created in the app need a default.
alter table public.vehicles alter column id set default gen_random_uuid();
alter table public.expenses alter column id set default gen_random_uuid();

-- Record where an expense moved from, and allow recording a move back to
-- "unassigned" (assigned_vehicle_id = null).
alter table public.expense_assignment_audit
  add column previous_vehicle_id uuid references public.vehicles(id),
  alter column assigned_vehicle_id drop not null;

create index if not exists idx_expense_assignment_audit_expense_id
  on public.expense_assignment_audit (expense_id);

-- Every change of an expense's vehicle is audited by the database itself, so
-- no client path (form, assign button, direct API call) can skip it.
-- security definer lets the trigger write the audit row even though no
-- client role is allowed to insert into the audit table directly.
create function public.audit_expense_vehicle_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.expense_assignment_audit
    (expense_id, previous_vehicle_id, assigned_vehicle_id, assigned_by)
  values
    (new.id, old.vehicle_id, new.vehicle_id, coalesce(auth.uid()::text, 'system'));
  return new;
end;
$$;

revoke execute on function public.audit_expense_vehicle_change() from public, anon, authenticated;

create trigger expenses_audit_vehicle_change
  after update of vehicle_id on public.expenses
  for each row
  when (old.vehicle_id is distinct from new.vehicle_id)
  execute function public.audit_expense_vehicle_change();

-- Audit rows are written only by the trigger above. Admins keep read access
-- (via the existing select policy) but can no longer insert, edit, or delete
-- history through the API.
drop policy "Admins write audit" on public.expense_assignment_audit;
