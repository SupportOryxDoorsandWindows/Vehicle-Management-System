-- Driver profile photos, uploaded by admins in the app.
-- There is no drivers table: vehicles.driver is free text, so a photo is keyed
-- by the driver's normalised name and follows them to every vehicle they drive.
-- Files live in the existing private vehicle-documents bucket under drivers/,
-- covered by that bucket's policies from 0006 (active users read, admins write).

create table public.driver_photos (
  id uuid primary key default gen_random_uuid(),
  -- lower-case, trimmed, single-spaced, so "Anoop  Kaloli" and "anoop kaloli" match.
  driver_key text not null unique
    check (driver_key <> '' and driver_key = lower(btrim(regexp_replace(driver_key, '\s+', ' ', 'g')))),
  driver_name text not null,
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid not null default auth.uid() references public.profiles(id),
  uploaded_at timestamptz not null default now()
);

alter table public.driver_photos enable row level security;

create policy "Active users read driver photos" on public.driver_photos
  for select using (public.current_user_role() is not null);

-- uploaded_by must be the caller, so an admin can't attribute a photo to someone else.
create policy "Admins add driver photos" on public.driver_photos
  for insert with check (public.current_user_role() = 'admin' and uploaded_by = auth.uid());

-- Replacing a driver's photo updates their single row.
create policy "Admins replace driver photos" on public.driver_photos
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin' and uploaded_by = auth.uid());

create policy "Admins remove driver photos" on public.driver_photos
  for delete using (public.current_user_role() = 'admin');
