-- Behaviour checks for migration 0006 (see supabase_stub.sql for how to run).
-- Runs after editing_and_assignment.sql, reusing its seeded users and vehicles.
-- Each block raises on the first unmet expectation.

create or replace function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;

-- ===== Admin =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare v uuid; e uuid; d uuid; n int;
begin
  select id into v from public.vehicles where plate_no = 'U 67931';
  select id into e from public.expenses where expense = 'Staff Uniform';

  insert into storage.objects (bucket_id, name) values ('vehicle-documents', 'vehicles/x/mulkiya/a.pdf');
  insert into public.documents (vehicle_id, kind, storage_path, file_name)
    values (v, 'mulkiya', 'vehicles/x/mulkiya/a.pdf', 'Registration Card.pdf') returning id into d;
  assert (select uploaded_by from public.documents where id = d) = '00000000-0000-0000-0000-00000000000a',
    'uploaded_by defaults to the caller';
  insert into public.documents (expense_id, kind, storage_path, file_name)
    values (e, 'invoice', 'expenses/x/invoice/b.pdf', 'Invoice.pdf');

  begin
    insert into public.documents (vehicle_id, kind, storage_path, file_name, uploaded_by)
      values (v, 'other', 'vehicles/x/other/forged.pdf', 'f.pdf', '00000000-0000-0000-0000-00000000000b');
    raise exception 'admin attributed an upload to someone else';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.documents (vehicle_id, kind, storage_path, file_name) values (v, 'invoice', 'p1', 'x');
    raise exception 'invoice allowed on a vehicle';
  exception when check_violation then null;
  end;
  begin
    insert into public.documents (expense_id, kind, storage_path, file_name) values (e, 'mulkiya', 'p2', 'x');
    raise exception 'mulkiya allowed on an expense';
  exception when check_violation then null;
  end;
  begin
    insert into public.documents (vehicle_id, expense_id, kind, storage_path, file_name) values (v, e, 'other', 'p3', 'x');
    raise exception 'document with two owners allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.documents (kind, storage_path, file_name) values ('other', 'p4', 'x');
    raise exception 'document with no owner allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.documents (vehicle_id, kind, storage_path, file_name) values (v, 'other', 'vehicles/x/mulkiya/a.pdf', 'dup');
    raise exception 'duplicate storage path allowed';
  exception when unique_violation then null;
  end;

  update public.documents set file_name = 'renamed' where id = d;
  get diagnostics n = row_count; assert n = 0, 'documents must not be editable';

  delete from public.documents where storage_path = 'expenses/x/invoice/b.pdf';
  get diagnostics n = row_count; assert n = 1, 'admin removes a document row';
  delete from storage.objects where name = 'vehicles/x/mulkiya/a.pdf';
  get diagnostics n = row_count; assert n = 1, 'admin removes a stored file';
  insert into storage.objects (bucket_id, name) values ('vehicle-documents', 'vehicles/x/mulkiya/a.pdf');
  raise notice 'DOCUMENTS ADMIN CHECKS PASSED';
end $$;
reset role;

-- ===== Viewer =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare v uuid; n int;
begin
  select id into v from public.vehicles where plate_no = 'U 67931';
  assert (select count(*) from public.documents) = 1, 'viewer reads documents';
  assert (select count(*) from storage.objects where bucket_id = 'vehicle-documents') = 1, 'viewer reads stored files';
  begin
    insert into public.documents (vehicle_id, kind, storage_path, file_name) values (v, 'other', 'vv', 'x');
    raise exception 'viewer added a document';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into storage.objects (bucket_id, name) values ('vehicle-documents', 'vehicles/x/other/v.pdf');
    raise exception 'viewer uploaded a file';
  exception when insufficient_privilege then null;
  end;
  delete from public.documents;
  get diagnostics n = row_count; assert n = 0, 'viewer removed a document row';
  delete from storage.objects;
  get diagnostics n = row_count; assert n = 0, 'viewer removed a stored file';
  raise notice 'DOCUMENTS VIEWER CHECKS PASSED';
end $$;
reset role;

-- ===== Admin who has been deactivated =====
update public.profiles set active = false where id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
begin
  assert (select count(*) from public.documents) = 0, 'deactivated user reads documents';
  assert (select count(*) from storage.objects) = 0, 'deactivated user reads stored files';
  raise notice 'DOCUMENTS DEACTIVATED CHECKS PASSED';
end $$;
reset role;
update public.profiles set active = true where id = '00000000-0000-0000-0000-00000000000a';

-- ===== Anonymous =====
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
declare n int;
begin
  assert (select count(*) from public.documents) = 0, 'anon reads documents';
  assert (select count(*) from storage.objects) = 0, 'anon reads stored files';
  begin
    insert into storage.objects (bucket_id, name) values ('vehicle-documents', 'anon.pdf');
    raise exception 'anon uploaded a file';
  exception when insufficient_privilege then null;
  end;
  raise notice 'DOCUMENTS ANON CHECKS PASSED';
end $$;
reset role;
