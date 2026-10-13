import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildStoragePath,
  removeDocument,
  safeFileName,
  uploadDocument,
  validateFile,
  DOCUMENTS_BUCKET,
} from '../documents';
import { supabase } from '../../lib/supabaseClient';
import type { StoredDocument } from '../../types';

vi.mock('../../lib/supabaseClient', () => ({ supabase: { from: vi.fn(), storage: { from: vi.fn() } } }));

const pdf = (name = 'Invoice.pdf', size = 1000) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' });

let bucket: { upload: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };
const calls: string[] = [];

beforeEach(() => {
  calls.length = 0;
  bucket = {
    upload: vi.fn(async () => {
      calls.push('storage.upload');
      return { data: {}, error: null };
    }),
    remove: vi.fn(async () => {
      calls.push('storage.remove');
      return { data: [], error: null };
    }),
  };
  vi.mocked(supabase.storage.from).mockReturnValue(bucket as never);
});

function mockTable(result: { data: unknown; error: unknown }, op: 'insert' | 'delete') {
  const terminal = vi.fn(async () => {
    calls.push(`documents.${op}`);
    return result;
  });
  const chain =
    op === 'insert'
      ? { insert: vi.fn(() => ({ select: () => ({ single: terminal }) })) }
      : { delete: vi.fn(() => ({ eq: () => ({ select: terminal }) })) };
  vi.mocked(supabase.from).mockReturnValue(chain as never);
  return chain;
}

describe('validateFile', () => {
  it('accepts PDFs and images up to 10 MB', () => {
    expect(validateFile('invoice', pdf())).toBeNull();
    expect(validateFile('vehicle_photo', new File(['x'], 'a.jpg', { type: 'image/jpeg' }))).toBeNull();
  });

  it('rejects other types, oversized files, and non-image photos', () => {
    expect(validateFile('other', new File(['x'], 'a.docx', { type: 'application/msword' }))).toMatch(/isn't a PDF/);
    expect(validateFile('invoice', pdf('big.pdf', 10 * 1024 * 1024 + 1))).toBe('big.pdf is larger than 10 MB.');
    expect(validateFile('vehicle_photo', pdf('photo.pdf'))).toMatch(/isn't a photo/);
  });
});

describe('storage paths', () => {
  it('reduces names to safe characters and keeps the extension', () => {
    expect(safeFileName('Mülkiya card (2026)#1.pdf')).toBe('Mulkiya_card_2026_1.pdf');
    expect(safeFileName('###')).toBe('file');
    expect(safeFileName(`${'a'.repeat(200)}.pdf`)).toMatch(/^a{96}\.pdf$/);
  });

  it('files each upload under its owner and kind with a unique prefix', () => {
    const a = buildStoragePath({ vehicleId: 'v1' }, 'mulkiya', 'Card.pdf');
    const b = buildStoragePath({ vehicleId: 'v1' }, 'mulkiya', 'Card.pdf');
    expect(a).toMatch(/^vehicles\/v1\/mulkiya\/[0-9a-f-]{36}-Card\.pdf$/);
    expect(a).not.toBe(b);
    expect(buildStoragePath({ expenseId: 'e1' }, 'invoice', 'x.pdf')).toMatch(/^expenses\/e1\/invoice\//);
  });
});

describe('uploadDocument', () => {
  it('stores the file, then records it with the original name', async () => {
    const chain = mockTable({ data: { id: 'd1' }, error: null }, 'insert');
    const file = pdf('Invoice March.pdf');

    await uploadDocument({ expenseId: 'e1' }, 'invoice', file);

    expect(supabase.storage.from).toHaveBeenCalledWith(DOCUMENTS_BUCKET);
    const [path, body, options] = bucket.upload.mock.calls[0];
    expect(path).toMatch(/^expenses\/e1\/invoice\/.+-Invoice_March\.pdf$/);
    expect(body).toBe(file);
    expect(options).toEqual({ contentType: 'application/pdf', upsert: false });
    expect(chain.insert).toHaveBeenCalledWith({
      vehicle_id: null,
      expense_id: 'e1',
      kind: 'invoice',
      storage_path: path,
      file_name: 'Invoice March.pdf',
      content_type: 'application/pdf',
      size_bytes: 1000,
    });
    expect(calls).toEqual(['storage.upload', 'documents.insert']);
  });

  it('removes the stored file again when recording it fails', async () => {
    mockTable({ data: null, error: { message: 'permission denied' } }, 'insert');

    await expect(uploadDocument({ vehicleId: 'v1' }, 'mulkiya', pdf())).rejects.toMatchObject({
      message: 'permission denied',
    });
    expect(calls).toEqual(['storage.upload', 'documents.insert', 'storage.remove']);
    expect(bucket.remove).toHaveBeenCalledWith([bucket.upload.mock.calls[0][0]]);
  });

  it('does not upload an invalid file at all', async () => {
    await expect(uploadDocument({ vehicleId: 'v1' }, 'vehicle_photo', pdf('scan.pdf'))).rejects.toThrow(/isn't a photo/);
    expect(bucket.upload).not.toHaveBeenCalled();
  });

  it('stops if the storage upload is rejected', async () => {
    bucket.upload.mockResolvedValueOnce({ data: null, error: { message: 'The object exceeded the maximum allowed size' } });
    mockTable({ data: { id: 'd1' }, error: null }, 'insert');

    await expect(uploadDocument({ vehicleId: 'v1' }, 'mulkiya', pdf())).rejects.toMatchObject({
      message: 'The object exceeded the maximum allowed size',
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('removeDocument', () => {
  const document = { id: 'd1', storage_path: 'vehicles/v1/mulkiya/x.pdf' } as StoredDocument;

  it('deletes the row before the file', async () => {
    mockTable({ data: [{ id: 'd1' }], error: null }, 'delete');
    await removeDocument(document);
    expect(calls).toEqual(['documents.delete', 'storage.remove']);
    expect(bucket.remove).toHaveBeenCalledWith(['vehicles/v1/mulkiya/x.pdf']);
  });

  it('keeps the file when the row could not be removed', async () => {
    mockTable({ data: [], error: null }, 'delete');
    await expect(removeDocument(document)).rejects.toThrow(/wasn't saved/);
    expect(bucket.remove).not.toHaveBeenCalled();
  });
});
