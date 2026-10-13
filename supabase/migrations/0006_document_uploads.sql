-- Phase 2 sub-project 3: document & photo uploads.
-- See docs/superpowers/specs/2026-10-13-document-uploads-design.md

-- Private bucket: files are only reachable through signed links issued to
-- logged-in, active users. Limits are enforced by Storage itself.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vehicle-documents',
  'vehicle-documents',
  false,
  10485760, -- 10 MB
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

create policy "Active users read vehicle documents" on storage.objects
  for select to authenticated
  using (bucket_id = 'vehicle-documents' and public.current_user_role() is not null);

create policy "Admins upload vehicle documents" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vehicle-documents' and public.current_user_role() = 'admin');

create policy "Admins remove vehicle documents" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vehicle-documents' and public.current_user_role() = 'admin');

create type public.document_kind as enum (
  'mulkiya', 'vehicle_license', 'cid_permit', 'advertisement_permit', 'vehicle_photo',
  'quotation', 'invoice', 'other'
);

-- One row per uploaded file, so a single query can fetch every attachment for
-- a vehicle's expenses, and so we know who uploaded what.
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid references public.vehicles(id),
  expense_id uuid references public.expenses(id),
  kind public.document_kind not null,
  storage_path text not null unique,
  file_name text not null,
  content_type text,
  size_bytes bigint,
  uploaded_by uuid not null default auth.uid() references public.profiles(id),
  uploaded_at timestamptz not null default now(),
  -- Exactly one owner, and only kinds that make sense for that owner.
  constraint documents_one_owner check ((vehicle_id is null) <> (expense_id is null)),
  constraint documents_kind_matches_owner check (
    (vehicle_id is not null and kind in
      ('mulkiya', 'vehicle_license', 'cid_permit', 'advertisement_permit', 'vehicle_photo', 'other'))
    or (expense_id is not null and kind in ('quotation', 'invoice', 'other'))
  )
);

create index idx_documents_vehicle_id on public.documents (vehicle_id);
create index idx_documents_expense_id on public.documents (expense_id);

alter table public.documents enable row level security;

create policy "Active users read documents" on public.documents
  for select using (public.current_user_role() is not null);

-- uploaded_by must be the caller, so an admin can't attribute a file to someone else.
create policy "Admins add documents" on public.documents
  for insert with check (public.current_user_role() = 'admin' and uploaded_by = auth.uid());

create policy "Admins remove documents" on public.documents
  for delete using (public.current_user_role() = 'admin');

-- No update policy: a file is replaced by removing it and uploading again.
