create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Returns the caller's role if they have an active profile, else null.
-- security definer + explicit search_path avoids RLS self-recursion when
-- this is called from policies on the profiles table itself.
create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and active = true;
$$;

-- profiles: a user can always read their own row; admins can read all.
create policy "Read own profile or admin reads all" on public.profiles
  for select using (id = auth.uid() or public.current_user_role() = 'admin');

-- profiles: only admins can change role/active on any row (including their own).
create policy "Admins update profiles" on public.profiles
  for update using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- No insert policy on profiles for authenticated users: rows are created
-- only by the invite-user Edge Function using the service role key, which
-- bypasses RLS by design.

-- Replace the Phase 1 "public read access" policies with authenticated-only
-- reads, and add admin-only writes, on every existing table.
drop policy "Public read access" on public.vehicles;
drop policy "Public read access" on public.expenses;
drop policy "Public read access" on public.expense_assignment_audit;

create policy "Authenticated active users read vehicles" on public.vehicles
  for select using (public.current_user_role() is not null);
create policy "Admins write vehicles" on public.vehicles
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "Authenticated active users read expenses" on public.expenses
  for select using (public.current_user_role() is not null);
create policy "Admins write expenses" on public.expenses
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "Authenticated active users read audit" on public.expense_assignment_audit
  for select using (public.current_user_role() is not null);
create policy "Admins write audit" on public.expense_assignment_audit
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
