-- Minimal stand-ins for what Supabase provides, so the migrations and
-- supabase/tests/editing_and_assignment.sql can run on a plain local Postgres:
--   createdb vms_test && psql -d vms_test -v ON_ERROR_STOP=1 \
--     -f supabase/tests/supabase_stub.sql -f supabase/migrations/0001_init_schema.sql \
--     -f supabase/migrations/0002_index_expenses_vehicle_id.sql \
--     -f supabase/migrations/0003_profiles_and_rls.sql \
--     -f supabase/migrations/0004_editing_and_assignment.sql \
--     -f supabase/tests/editing_and_assignment.sql
create schema auth;
create table auth.users (id uuid primary key);
-- Same source as Supabase's auth.uid(): the "sub" claim of the request's JWT.
create function auth.uid() returns uuid language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
$$;
-- Roles are cluster-wide, so tolerate them existing from an earlier run.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
end $$;
grant usage on schema public, auth to anon, authenticated;
grant execute on function auth.uid() to anon, authenticated;
-- Supabase grants table/function privileges broadly and relies on RLS.
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on functions to anon, authenticated;
