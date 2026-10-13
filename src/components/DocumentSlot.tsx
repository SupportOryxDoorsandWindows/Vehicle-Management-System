import { useRef, useState } from 'react';
import { ALLOWED_CONTENT_TYPES } from '../api/documents';
import { formatFileSize } from '../lib/documentFiles';
import type { DocumentWithUrl } from '../types';

export function FileLink({ document }: { document: DocumentWithUrl }) {
  const size = formatFileSize(document.size_bytes);
  return (
    <>
      {document.url ? (
        <a href={document.url} target="_blank" rel="noreferrer" className="text-oryx-blue underline break-all">
          {document.file_name}
        </a>
      ) : (
        <span className="break-all">{document.file_name} (link unavailable)</span>
      )}
      {size && <span className="text-xs text-oryx-silver ml-1">{size}</span>}
    </>
  );
}

export function UploadButton({
  label,
  accept = ALLOWED_CONTENT_TYPES,
  onUpload,
}: {
  label: string;
  accept?: string[];
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  return (
    <label className="inline-block border border-oryx-blue text-oryx-blue rounded px-2 py-0.5 text-xs cursor-pointer has-[:disabled]:opacity-50">
      {uploading ? 'Uploading...' : 'Upload'}
      <input
        ref={inputRef}
        type="file"
        aria-label={`Upload ${label}`}
        accept={accept.join(',')}
        disabled={uploading}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setUploading(true);
          await onUpload(file);
          setUploading(false);
          // Allow choosing the same file again after a failed attempt.
          if (inputRef.current) inputRef.current.value = '';
        }}
      />
    </label>
  );
}

interface DocumentSlotProps {
  label: string;
  documents: DocumentWithUrl[] | undefined;
  /** File names from the original spreadsheet; the files themselves were never migrated. */
  legacyNames?: string[];
  canEdit: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: (document: DocumentWithUrl) => Promise<void>;
}

/** The uploaded files of one kind, plus upload/remove controls for Admins. */
export function DocumentSlot({ label, documents, legacyNames = [], canEdit, onUpload, onRemove }: DocumentSlotProps) {
  if (documents === undefined) return <span className="text-oryx-silver">Loading...</span>;
  const empty = documents.length === 0 && legacyNames.length === 0;

  return (
    <div className="space-y-1 py-1">
      {documents.length > 0 && (
        <ul className="space-y-1">
          {documents.map((d) => (
            <li key={d.id}>
              <FileLink document={d} />
              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Remove ${d.file_name}?`)) onRemove(d);
                  }}
                  className="ml-2 text-xs text-red-700 underline"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {legacyNames.length > 0 && (
        <div className="text-xs text-oryx-silver">
          Listed in the original spreadsheet (file not uploaded):
          <ul className="list-disc ml-4">
            {legacyNames.map((name) => (
              <li key={name} className="break-all">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {empty && !canEdit && <span className="text-oryx-silver">Not Available</span>}
      {canEdit && <UploadButton label={label} onUpload={onUpload} />}
    </div>
  );
}
