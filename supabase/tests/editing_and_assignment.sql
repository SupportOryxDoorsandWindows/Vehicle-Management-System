-- Behaviour checks for migration 0004 (see supabase_stub.sql for how to run).
-- Each block raises on the first unmet expectation.
-- Seed (as table owner)
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (id, email, role) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@test', 'admin'),
  ('00000000-0000-0000-0000-00000000000b', 'viewer@test', 'viewer');
insert into public.vehicles (plate_no) values ('U 67931'), ('CC 16257');
insert into public.expenses (expense, system_category) values ('Staff Uniform', 'other');

create function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;

-- ===== Admin =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare v uuid; e uuid; n int; rows jsonb;
begin
  insert into public.vehicles (plate_no) values ('NEW 1') returning id into v;
  assert v is not null, 'admin insert vehicle without id';
  update public.vehicles set driver = 'Ronald' where id = v;
  get diagnostics n = row_count; assert n = 1, 'admin update vehicle';
  begin
    insert into public.vehicles (plate_no) values ('NEW 1');
    raise exception 'duplicate plate was allowed';
  exception when unique_violation then null;
  end;
  insert into public.expenses (expense, system_category, vehicle_id) values ('Oil change', 'maintenance', v) returning id into e;
  assert e is not null, 'admin insert expense without id';
  assert (select count(*) from public.expense_assignment_audit where expense_id = e) = 0, 'insert with vehicle must not audit';

  select id into e from public.expenses where expense = 'Staff Uniform';
  select id into v from public.vehicles where plate_no = 'U 67931';
  update public.expenses set vehicle_id = v where id = e;                       -- assign
  update public.expenses set cost = 10 where id = e;                            -- unrelated edit
  update public.expenses set vehicle_id = v where id = e;                       -- same vehicle again
  update public.expenses set vehicle_id = (select id from public.vehicles where plate_no='CC 16257') where id = e; -- move
  update public.expenses set vehicle_id = null where id = e;                    -- unassign
  select jsonb_agg(jsonb_build_object('prev', previous_vehicle_id, 'new', assigned_vehicle_id, 'by', assigned_by) order by assigned_at, id)
    into rows from public.expense_assignment_audit where expense_id = e;
  assert jsonb_array_length(rows) = 3, format('expected 3 audit rows, got %s', rows);
  assert (select bool_and(assigned_by = '00000000-0000-0000-0000-00000000000a') from public.expense_assignment_audit where expense_id = e), 'audit actor is the admin';
  assert exists (select 1 from public.expense_assignment_audit where expense_id = e and previous_vehicle_id is null and assigned_vehicle_id = v), 'assign row';
  assert exists (select 1 from public.expense_assignment_audit where expense_id = e and previous_vehicle_id is not null and assigned_vehicle_id is null), 'unassign row';

  begin
    insert into public.expense_assignment_audit (expense_id, assigned_vehicle_id, assigned_by) values (e, v, 'forged');
    raise exception 'admin forged an audit row';
  exception when insufficient_privilege then null;
  end;
  update public.expense_assignment_audit set assigned_by = 'tampered' where expense_id = e;
  get diagnostics n = row_count; assert n = 0, 'admin edited audit history';
  delete from public.expense_assignment_audit where expense_id = e;
  get diagnostics n = row_count; assert n = 0, 'admin deleted audit history';
  begin
    perform public.audit_expense_vehicle_change();
    raise exception 'trigger function callable directly';
  exception when insufficient_privilege or feature_not_supported then null;
  end;
  raise notice 'ADMIN CHECKS PASSED';
end $$;
reset role;

-- ===== Viewer =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare n int; e uuid; v uuid;
begin
  assert (select count(*) from public.vehicles) = 3, 'viewer reads vehicles';
  assert (select count(*) from public.expense_assignment_audit) = 3, 'viewer reads audit';
  begin
    insert into public.vehicles (plate_no) values ('VIEWER');
    raise exception 'viewer inserted a vehicle';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.expenses (expense, system_category) values ('x', 'other');
    raise exception 'viewer inserted an expense';
  exception when insufficient_privilege then null;
  end;
  select id into e from public.expenses where expense = 'Staff Uniform';
  select id into v from public.vehicles where plate_no = 'U 67931';
  update public.expenses set vehicle_id = v where id = e;
  get diagnostics n = row_count; assert n = 0, 'viewer assigned an expense';
  update public.vehicles set driver = 'x';
  get diagnostics n = row_count; assert n = 0, 'viewer edited vehicles';
  assert (select count(*) from public.expense_assignment_audit) = 3, 'viewer attempt must not create audit rows';
  raise notice 'VIEWER CHECKS PASSED';
end $$;
reset role;

-- ===== Anonymous =====
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
declare n int;
begin
  assert (select count(*) from public.vehicles) = 0, 'anon reads vehicles';
  assert (select count(*) from public.expense_assignment_audit) = 0, 'anon reads audit';
  update public.expenses set vehicle_id = null;
  get diagnostics n = row_count; assert n = 0, 'anon updated expenses';
  begin
    insert into public.vehicles (plate_no) values ('ANON');
    raise exception 'anon inserted a vehicle';
  exception when insufficient_privilege then null;
  end;
  raise notice 'ANON CHECKS PASSED';
end $$;
reset role;
