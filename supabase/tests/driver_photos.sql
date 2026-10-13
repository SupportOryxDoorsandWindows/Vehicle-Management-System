-- Behaviour checks for migration 0008 (see supabase_stub.sql for how to run).
-- Runs after editing_and_assignment.sql, reusing its seeded admin and viewer.

create or replace function pg_temp.as_user(uid text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;

-- ===== Admin =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare n int;
begin
  insert into public.driver_photos (driver_key, driver_name, storage_path, file_name)
    values ('anoop kaloli', 'Anoop  Kaloli', 'drivers/anoop-kaloli/a.jpg', 'a.jpg');
  assert (select uploaded_by from public.driver_photos where driver_key = 'anoop kaloli') = '00000000-0000-0000-0000-00000000000a',
    'uploaded_by defaults to the caller';
  begin
    insert into public.driver_photos (driver_key, driver_name, storage_path, file_name)
      values ('Anoop  Kaloli', 'Anoop  Kaloli', 'drivers/x/b.jpg', 'b.jpg');
    raise exception 'un-normalised driver_key allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.driver_photos (driver_key, driver_name, storage_path, file_name)
      values ('anoop kaloli', 'Anoop Kaloli', 'drivers/x/c.jpg', 'c.jpg');
    raise exception 'second photo row for one driver allowed';
  exception when unique_violation then null;
  end;
  -- Naming someone else as uploader is overridden by the database (0009).
  insert into public.driver_photos (driver_key, driver_name, storage_path, file_name, uploaded_by)
    values ('someone', 'Someone', 'drivers/x/d.jpg', 'd.jpg', '00000000-0000-0000-0000-00000000000b');
  assert (select uploaded_by from public.driver_photos where driver_key = 'someone') = '00000000-0000-0000-0000-00000000000a',
    'admin attributed a photo to someone else';
  -- replace in place (upsert)
  insert into public.driver_photos (driver_key, driver_name, storage_path, file_name)
    values ('anoop kaloli', 'Anoop  Kaloli', 'drivers/anoop-kaloli/new.jpg', 'new.jpg')
    on conflict (driver_key) do update
      set storage_path = excluded.storage_path, file_name = excluded.file_name;
  assert (select storage_path from public.driver_photos where driver_key = 'anoop kaloli') = 'drivers/anoop-kaloli/new.jpg',
    'admin replaces a photo';
  raise notice 'DRIVER PHOTOS ADMIN CHECKS PASSED';
end $$;
reset role;

-- ===== A second admin replaces the first admin's photo =====
reset role;
insert into auth.users values ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles (id, email, role) values ('00000000-0000-0000-0000-00000000000c', 'admin2@test', 'admin');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
set role authenticated;
do $$
begin
  -- The same upsert the app sends: uploaded_by is not in the payload.
  insert into public.driver_photos (driver_key, driver_name, storage_path, file_name)
    values ('anoop kaloli', 'Anoop  Kaloli', 'drivers/anoop-kaloli/third.jpg', 'third.jpg')
    on conflict (driver_key) do update
      set storage_path = excluded.storage_path, file_name = excluded.file_name;
  assert (select uploaded_by from public.driver_photos where driver_key = 'anoop kaloli') = '00000000-0000-0000-0000-00000000000c',
    'replacement is attributed to the admin who made it';
  raise notice 'DRIVER PHOTOS SECOND ADMIN CHECK PASSED';
end $$;
reset role;

-- ===== Viewer =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare n int;
begin
  assert (select count(*) from public.driver_photos) = 2, 'viewer reads driver photos';
  begin
    insert into public.driver_photos (driver_key, driver_name, storage_path, file_name)
      values ('viewer', 'Viewer', 'drivers/v/v.jpg', 'v.jpg');
    raise exception 'viewer added a driver photo';
  exception when insufficient_privilege then null;
  end;
  update public.driver_photos set file_name = 'x' where driver_key = 'anoop kaloli';
  get diagnostics n = row_count; assert n = 0, 'viewer replaced a driver photo';
  delete from public.driver_photos where driver_key = 'anoop kaloli';
  get diagnostics n = row_count; assert n = 0, 'viewer removed a driver photo';
  raise notice 'DRIVER PHOTOS VIEWER CHECKS PASSED';
end $$;
reset role;

-- ===== Anonymous =====
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
begin
  assert (select count(*) from public.driver_photos) = 0, 'anon reads driver photos';
  raise notice 'DRIVER PHOTOS ANON CHECKS PASSED';
end $$;
reset role;

-- ===== Admin removes =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
set role authenticated;
do $$
declare n int;
begin
  delete from public.driver_photos where driver_key = 'anoop kaloli';
  get diagnostics n = row_count; assert n = 1, 'admin removes a driver photo';
  raise notice 'DRIVER PHOTOS REMOVE CHECK PASSED';
end $$;
reset role;
