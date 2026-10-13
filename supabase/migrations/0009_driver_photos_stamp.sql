-- Who uploaded a driver photo, and when, is set by the database on every insert
-- and replacement. Without this, a replacement kept the original uploader, so
-- the "uploaded_by = caller" policy from 0008 blocked any other admin from
-- replacing a photo.
create function public.stamp_driver_photo_upload()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.uploaded_by := coalesce(auth.uid(), new.uploaded_by);
  new.uploaded_at := now();
  return new;
end;
$$;

create trigger driver_photos_stamp_upload
  before insert or update on public.driver_photos
  for each row
  execute function public.stamp_driver_photo_upload();
