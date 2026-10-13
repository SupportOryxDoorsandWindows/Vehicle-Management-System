-- Service & mileage log, and a log of deleted records.
-- See docs/superpowers/specs/2026-10-13-service-log-and-deletes-design.md

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  record_date date not null,
  kind text not null
    check (kind in ('service', 'repair', 'tyres', 'battery', 'inspection', 'reading', 'other')),
  odometer_km numeric check (odometer_km >= 0),
  garage text,
  description text,
  next_service_date date,
  next_service_km numeric check (next_service_km >= 0),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  -- A plain odometer reading is pointless without the reading.
  constraint service_records_reading_has_odometer check (kind <> 'reading' or odometer_km is not null)
);

create index idx_service_records_vehicle_date on public.service_records (vehicle_id, record_date desc);

-- Who recorded it, and when, is set by the database and never changes afterwards.
create function public.stamp_service_record()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.created_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;

create trigger service_records_stamp
  before insert or update on public.service_records
  for each row
  execute function public.stamp_service_record();

alter table public.service_records enable row level security;

create policy "Active users read service records" on public.service_records
  for select using (public.current_user_role() is not null);
create policy "Admins write service records" on public.service_records
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- A full copy of every deleted vehicle, expense and service record, so a
-- mistaken delete can be undone. Written only by the trigger below.
create table public.deleted_records (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  record jsonb not null,
  -- auth user id; null for deletes made outside the app. No foreign key, so
  -- the log never blocks or loses anything.
  deleted_by uuid,
  deleted_at timestamptz not null default now()
);

create index idx_deleted_records_deleted_at on public.deleted_records (deleted_at desc);

alter table public.deleted_records enable row level security;

-- Admins only: Viewers can't see records that have been removed.
create policy "Admins read deleted records" on public.deleted_records
  for select using (public.current_user_role() = 'admin');
-- No insert, update or delete policies: only the trigger writes here.

create function public.log_deleted_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.deleted_records (table_name, record_id, record, deleted_by)
  values (tg_table_name, old.id, to_jsonb(old), auth.uid());
  return old;
end;
$$;

revoke execute on function public.log_deleted_record() from public, anon, authenticated;

create trigger vehicles_log_delete after delete on public.vehicles
  for each row execute function public.log_deleted_record();
create trigger expenses_log_delete after delete on public.expenses
  for each row execute function public.log_deleted_record();
create trigger service_records_log_delete after delete on public.service_records
  for each row execute function public.log_deleted_record();
