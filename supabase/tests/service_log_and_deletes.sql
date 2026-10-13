-- Behaviour checks for migrations 0010 and 0011 (see supabase_stub.sql for how to run).
-- Runs after editing_and_assignment.sql, reusing its seeded admin and viewer.

create or replace function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;

-- ===== Admin: service records =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare v uuid; r uuid; n int;
begin
  insert into public.vehicles (plate_no) values ('SVC 1') returning id into v;
  -- Naming someone else as the recorder is overridden by the database.
  insert into public.service_records (vehicle_id, record_date, kind, odometer_km, next_service_km, created_by)
    values (v, '2026-09-01', 'service', 120000, 130000, '00000000-0000-0000-0000-00000000000b')
    returning id into r;
  assert (select created_by from public.service_records where id = r) = '00000000-0000-0000-0000-00000000000a',
    'created_by is the caller';
  update public.service_records set garage = 'Saluki', created_by = '00000000-0000-0000-0000-00000000000b',
    created_at = '2000-01-01' where id = r;
  get diagnostics n = row_count; assert n = 1, 'admin edits a service record';
  assert (select created_by = '00000000-0000-0000-0000-00000000000a' and created_at > '2026-01-01'
          from public.service_records where id = r), 'created_by/at unchanged by an edit';
  insert into public.service_records (vehicle_id, record_date, kind, odometer_km) values (v, '2026-10-01', 'reading', 124500);
  begin
    insert into public.service_records (vehicle_id, record_date, kind) values (v, '2026-10-02', 'reading');
    raise exception 'reading without odometer allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.service_records (vehicle_id, record_date, kind, odometer_km) values (v, '2026-10-02', 'service', -1);
    raise exception 'negative odometer allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.service_records (vehicle_id, record_date, kind) values (v, '2026-10-02', 'wash');
    raise exception 'unknown kind allowed';
  exception when check_violation then null;
  end;
  raise notice 'SERVICE LOG ADMIN CHECKS PASSED';
end $$;
reset role;

-- ===== Viewer =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare v uuid; n int;
begin
  select id into v from public.vehicles where plate_no = 'SVC 1';
  assert (select count(*) from public.service_records where vehicle_id = v) = 2, 'viewer reads service records';
  begin
    insert into public.service_records (vehicle_id, record_date, kind) values (v, '2026-10-03', 'other');
    raise exception 'viewer added a service record';
  exception when insufficient_privilege then null;
  end;
  update public.service_records set garage = 'x' where vehicle_id = v;
  get diagnostics n = row_count; assert n = 0, 'viewer edited a service record';
  delete from public.service_records where vehicle_id = v;
  get diagnostics n = row_count; assert n = 0, 'viewer deleted a service record';
  delete from public.vehicles where id = v;
  get diagnostics n = row_count; assert n = 0, 'viewer deleted a vehicle';
  delete from public.expenses;
  get diagnostics n = row_count; assert n = 0, 'viewer deleted expenses';
  raise notice 'SERVICE LOG VIEWER CHECKS PASSED';
end $$;
reset role;

-- ===== Anonymous =====
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
begin
  assert (select count(*) from public.service_records) = 0, 'anon reads service records';
  assert (select count(*) from public.deleted_records) = 0, 'anon reads deleted records';
  raise notice 'SERVICE LOG ANON CHECKS PASSED';
end $$;
reset role;

-- ===== Admin: deletes =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare v uuid; v2 uuid; v3 uuid; e uuid; n int;
begin
  -- A vehicle with service records and a document: both go with it, and are logged.
  select id into v from public.vehicles where plate_no = 'SVC 1';
  insert into public.documents (vehicle_id, kind, storage_path, file_name)
    values (v, 'mulkiya', 'vehicles/svc1/mulkiya/a.pdf', 'a.pdf');
  delete from public.vehicles where id = v;
  get diagnostics n = row_count; assert n = 1, 'admin deletes a vehicle';
  assert (select count(*) from public.service_records where vehicle_id = v) = 0, 'service records deleted with the vehicle';
  assert (select count(*) from public.documents where vehicle_id = v) = 0, 'documents deleted with the vehicle';
  assert (select count(*) from public.deleted_records where record_id = v and table_name = 'vehicles'
          and record ->> 'plate_no' = 'SVC 1' and deleted_by = '00000000-0000-0000-0000-00000000000a') = 1,
    'vehicle delete logged with a copy and the actor';
  assert (select count(*) from public.deleted_records where table_name = 'service_records'
          and record ->> 'vehicle_id' = v::text) = 2, 'cascaded service record deletes logged';

  -- A vehicle with an expense can't be deleted.
  insert into public.vehicles (plate_no) values ('DEL 2') returning id into v2;
  insert into public.expenses (expense, system_category, vehicle_id) values ('Tyres', 'maintenance', v2);
  begin
    delete from public.vehicles where id = v2;
    raise exception 'vehicle with expenses deleted';
  exception when foreign_key_violation then null;
  end;

  -- Nor can one with assignment history, even once its expenses have moved away.
  insert into public.vehicles (plate_no) values ('DEL 3') returning id into v3;
  insert into public.expenses (expense, system_category) values ('Car wash', 'other') returning id into e;
  update public.expenses set vehicle_id = v3 where id = e;
  update public.expenses set vehicle_id = null where id = e;
  begin
    delete from public.vehicles where id = v3;
    raise exception 'vehicle with assignment history deleted';
  exception when foreign_key_violation then null;
  end;

  -- Deleting an expense removes its attachments and keeps its history, blanked.
  insert into public.documents (expense_id, kind, storage_path, file_name)
    values (e, 'invoice', 'expenses/carwash/invoice/b.pdf', 'b.pdf');
  delete from public.expenses where id = e;
  get diagnostics n = row_count; assert n = 1, 'admin deletes an expense';
  assert (select count(*) from public.documents where expense_id = e) = 0, 'attachments deleted with the expense';
  assert (select count(*) from public.expense_assignment_audit where expense_id is null and
          (assigned_vehicle_id = v3 or previous_vehicle_id = v3)) = 2, 'history kept with a blank expense';
  assert (select count(*) from public.deleted_records where record_id = e and table_name = 'expenses'
          and record ->> 'expense' = 'Car wash') = 1, 'expense delete logged';

  -- The log can't be written through the API.
  begin
    insert into public.deleted_records (table_name, record_id, record) values ('vehicles', v, '{}');
    raise exception 'admin forged a deleted record';
  exception when insufficient_privilege then null;
  end;
  update public.deleted_records set record = '{}';
  get diagnostics n = row_count; assert n = 0, 'admin edited deleted records';
  delete from public.deleted_records;
  get diagnostics n = row_count; assert n = 0, 'admin deleted deleted records';
  begin
    perform public.log_deleted_record();
    raise exception 'log function callable directly';
  exception when insufficient_privilege or feature_not_supported then null;
  end;
  raise notice 'DELETE ADMIN CHECKS PASSED';
end $$;
reset role;

-- ===== Viewer can't read the deletion log =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
begin
  assert (select count(*) from public.deleted_records) = 0, 'viewer reads deleted records';
  raise notice 'DELETE VIEWER CHECKS PASSED';
end $$;
reset role;
