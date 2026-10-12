-- Audit rows are written only by the expenses_audit_vehicle_change trigger (0004).
-- Admins keep read access (via the existing select policy) but can no longer
-- insert, edit, or delete history through the API.
-- Kept separate from 0004 because it is the only destructive statement, so it
-- can be reviewed and approved on its own.
drop policy "Admins write audit" on public.expense_assignment_audit;
