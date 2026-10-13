import { supabase } from '../lib/supabaseClient';
import { NOT_SAVED_MESSAGE } from './errors';
import type { DocumentKind, DocumentWithUrl, StoredDocument } from '../types';

export const DOCUMENTS_BUCKET = 'vehicle-documents';
// Mirrors the bucket's limits in migration 0006, so users get a clear message
// before the upload is attempted.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_CONTENT_TYPES = ALLOWED_CONTENT_TYPES.filter((t) => t.startsWith('image/'));
const SIGNED_URL_SECONDS = 60 * 60;

export type DocumentOwner = { vehicleId: string } | { expenseId: string };

export function validateFile(kind: DocumentKind, file: File): string | null {
  if (kind === 'vehicle_photo' && !IMAGE_CONTENT_TYPES.includes(file.type)) {
    return `${file.name} isn't a photo. Use a JPEG, PNG or WebP image.`;
  }
  if (!ALLOWED_CONTENT_TYPES.includes(file.type)) {
    return `${file.name} isn't a PDF, JPEG, PNG or WebP file.`;
  }
  if (file.size > MAX_FILE_BYTES) return `${file.name} is larger than 10 MB.`;
  return null;
}

/** Storage keys allow a limited character set; the original name is kept in the row for display. */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // drop accents: "Mülkiya" -> "Mulkiya"
    .replace(/[^\w.-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  // Keep the end so the extension survives.
  return cleaned.slice(-100) || 'file';
}

export function buildStoragePath(owner: DocumentOwner, kind: DocumentKind, fileName: string): string {
  const folder = 'vehicleId' in owner ? `vehicles/${owner.vehicleId}` : `expenses/${owner.expenseId}`;
  // The random prefix means two files with the same name never overwrite each other.
  return `${folder}/${kind}/${crypto.randomUUID()}-${safeFileName(fileName)}`;
}

async function withSignedUrls(documents: StoredDocument[]): Promise<DocumentWithUrl[]> {
  if (documents.length === 0) return [];
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrls(
      documents.map((d) => d.storage_path),
      SIGNED_URL_SECONDS
    );
  if (error) throw error;
  const urlByPath = new Map(data.filter((s) => !s.error && s.path).map((s) => [s.path, s.signedUrl]));
  return documents.map((d) => ({ ...d, url: urlByPath.get(d.storage_path) ?? null }));
}

export async function fetchVehicleDocuments(vehicleId: string): Promise<DocumentWithUrl[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return withSignedUrls(data as StoredDocument[]);
}

export async function fetchExpenseDocuments(expenseIds: string[]): Promise<DocumentWithUrl[]> {
  if (expenseIds.length === 0) return [];
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .in('expense_id', expenseIds)
    .order('uploaded_at', { ascending: false });
  if (error) throw error;
  return withSignedUrls(data as StoredDocument[]);
}

export async function fetchLatestVehiclePhoto(vehicleId: string): Promise<DocumentWithUrl | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .eq('kind', 'vehicle_photo')
    .order('uploaded_at', { ascending: false })
    .limit(1);
  if (error) throw error;
  const [photo] = await withSignedUrls(data as StoredDocument[]);
  return photo ?? null;
}

/** Stores the file, then records it. If recording fails the stored file is removed again. */
export async function uploadDocument(
  owner: DocumentOwner,
  kind: DocumentKind,
  file: File
): Promise<StoredDocument> {
  const invalid = validateFile(kind, file);
  if (invalid) throw new Error(invalid);

  const path = buildStoragePath(owner, kind, file.name);
  const bucket = supabase.storage.from(DOCUMENTS_BUCKET);
  const { error: uploadError } = await bucket.upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('documents')
    .insert({
      vehicle_id: 'vehicleId' in owner ? owner.vehicleId : null,
      expense_id: 'expenseId' in owner ? owner.expenseId : null,
      kind,
      storage_path: path,
      file_name: file.name,
      content_type: file.type,
      size_bytes: file.size,
    })
    .select()
    .single();
  if (error) {
    // Best effort: if this also fails, the file is unreachable (no row links to it).
    await bucket.remove([path]);
    throw error;
  }
  return data as StoredDocument;
}

/**
 * Removes the row first, then the file: if the file removal fails we leave an
 * unreachable file, never a link to a file that no longer exists.
 */
export async function removeDocument(document: StoredDocument): Promise<void> {
  const { data, error } = await supabase.from('documents').delete().eq('id', document.id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOT_SAVED_MESSAGE);
  await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.storage_path]);
}
