-- Phase 2 sub-project 6: reminder settings.
-- See docs/superpowers/specs/2026-10-13-audit-history-and-reminders-design.md

-- Exactly one row: the primary key can only ever be true.
create table public.app_settings (
  id boolean primary key default true check (id),
  -- How many days before expiry a document counts as "Expiring Soon".
  expiring_soon_days integer not null default 30 check (expiring_soon_days between 1 and 365),
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (true);

-- Who changed it and when is set by the database, so it can't be faked.
create function public.stamp_app_settings_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create trigger app_settings_stamp_update
  before update on public.app_settings
  for each row
  execute function public.stamp_app_settings_update();

alter table public.app_settings enable row level security;

create policy "Active users read settings" on public.app_settings
  for select using (public.current_user_role() is not null);

create policy "Admins update settings" on public.app_settings
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- No insert or delete policy: the single row above is the only one.
