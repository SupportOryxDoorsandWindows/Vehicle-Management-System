-- Behaviour checks for migration 0007 (see supabase_stub.sql for how to run).
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
  assert (select expiring_soon_days from public.app_settings) = 30, 'default is 30 days';
  update public.app_settings
    set expiring_soon_days = 45,
        updated_by = '00000000-0000-0000-0000-00000000000b',  -- try to blame someone else
        updated_at = '2000-01-01';
  get diagnostics n = row_count; assert n = 1, 'admin updates settings';
  assert (select updated_by from public.app_settings) = '00000000-0000-0000-0000-00000000000a', 'updated_by is the caller';
  assert (select updated_at > now() - interval '1 minute' from public.app_settings), 'updated_at is now';
  begin
    update public.app_settings set expiring_soon_days = 0;
    raise exception '0 days allowed';
  exception when check_violation then null;
  end;
  begin
    update public.app_settings set expiring_soon_days = 366;
    raise exception '366 days allowed';
  exception when check_violation then null;
  end;
  begin
    insert into public.app_settings (id) values (false);
    raise exception 'second settings row allowed';
  exception when insufficient_privilege or check_violation then null;
  end;
  delete from public.app_settings;
  get diagnostics n = row_count; assert n = 0, 'admin deleted the settings row';
  raise notice 'SETTINGS ADMIN CHECKS PASSED';
end $$;
reset role;

-- The single-row rule holds even for the table owner.
do $$
begin
  insert into public.app_settings (id) values (false);
  raise exception 'id = false allowed';
exception when check_violation then
  raise notice 'SETTINGS SINGLE-ROW CHECK PASSED';
end $$;

-- ===== Viewer =====
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
set role authenticated;
do $$
declare n int;
begin
  assert (select expiring_soon_days from public.app_settings) = 45, 'viewer reads settings';
  update public.app_settings set expiring_soon_days = 10;
  get diagnostics n = row_count; assert n = 0, 'viewer changed settings';
  raise notice 'SETTINGS VIEWER CHECKS PASSED';
end $$;
reset role;

-- ===== Anonymous =====
select set_config('request.jwt.claims', '', false);
set role anon;
do $$
begin
  assert (select count(*) from public.app_settings) = 0, 'anon reads settings';
  raise notice 'SETTINGS ANON CHECKS PASSED';
end $$;
reset role;
