import { supabase } from '../lib/supabaseClient';
import { NOT_SAVED_MESSAGE } from './errors';
import { DOCUMENTS_BUCKET, safeFileName, validateFile } from './documents';

const SIGNED_URL_SECONDS = 60 * 60;

export interface DriverPhoto {
  id: string;
  driver_key: string;
  driver_name: string;
  storage_path: string;
  file_name: string;
  content_type: string | null;
  size_bytes: number | null;
  uploaded_by: string;
  uploaded_at: string;
}

export interface DriverPhotoWithUrl extends DriverPhoto {
  url: string | null;
}

/** "  Anoop  Kaloli " -> "anoop kaloli": how a driver's photo is found, whichever vehicle names them. */
export function driverKey(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase();
}

async function findDriverPhoto(key: string): Promise<DriverPhoto | null> {
  const { data, error } = await supabase.from('driver_photos').select('*').eq('driver_key', key).maybeSingle();
  if (error) throw error;
  return data as DriverPhoto | null;
}

export async function fetchDriverPhoto(driver: string): Promise<DriverPhotoWithUrl | null> {
  const key = driverKey(driver);
  if (!key) return null;
  const photo = await findDriverPhoto(key);
  if (!photo) return null;
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(photo.storage_path, SIGNED_URL_SECONDS);
  if (error) throw error;
  return { ...photo, url: data?.signedUrl ?? null };
}

/**
 * Stores the new photo, then points the driver's single row at it (the database
 * stamps who uploaded it and when), then removes
 * the previous file. If saving the row fails the new file is removed again, so
 * the driver keeps their old photo.
 */
export async function uploadDriverPhoto(driver: string, file: File): Promise<DriverPhoto> {
  const key = driverKey(driver);
  if (!key) throw new Error('This vehicle has no driver to attach a photo to.');
  const invalid = validateFile('vehicle_photo', file);
  if (invalid) throw new Error(invalid);

  const previous = await findDriverPhoto(key);
  const slug = key.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'driver';
  const path = `drivers/${slug}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const bucket = supabase.storage.from(DOCUMENTS_BUCKET);

  const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('driver_photos')
    .upsert(
      {
        driver_key: key,
        driver_name: driver.trim(),
        storage_path: path,
        file_name: file.name,
        content_type: file.type,
        size_bytes: file.size,
      },
      { onConflict: 'driver_key' }
    )
    .select()
    .single();
  if (error) {
    await bucket.remove([path]);
    throw error;
  }
  if (previous) await bucket.remove([previous.storage_path]);
  return data as DriverPhoto;
}

/** Row first, then file: a failed file removal leaves an unreachable file, never a broken photo. */
export async function removeDriverPhoto(photo: DriverPhoto): Promise<void> {
  const { data, error } = await supabase.from('driver_photos').delete().eq('id', photo.id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOT_SAVED_MESSAGE);
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([photo.storage_path]);
}

/** Every uploaded driver photo, keyed by driverKey(), with signed links made in one request. */
export async function fetchDriverPhotoUrls(): Promise<Map<string, string>> {
  const { data, error } = await supabase.from('driver_photos').select('driver_key, storage_path');
  if (error) throw error;
  const photos = (data ?? []) as Pick<DriverPhoto, 'driver_key' | 'storage_path'>[];
  const urls = new Map<string, string>();
  if (photos.length === 0) return urls;
  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(
      photos.map((p) => p.storage_path),
      SIGNED_URL_SECONDS
    );
  if (signError) throw signError;
  const byPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  for (const p of photos) {
    const url = byPath.get(p.storage_path);
    if (url) urls.set(p.driver_key, url);
  }
  return urls;
}
