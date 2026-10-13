import { useState } from 'react';
import { removeDocument, uploadDocument, type DocumentOwner } from '../api/documents';
import { errorMessage, useLoad } from './useLoad';
import type { DocumentKind, DocumentWithUrl } from '../types';

/**
 * Loads an owner's documents and exposes upload/remove. Failures from either
 * action land in `actionError`; the list reloads afterwards either way so it
 * shows what was actually saved.
 */
export function useDocuments(owner: DocumentOwner, load: () => Promise<DocumentWithUrl[]>) {
  const ownerKey = 'vehicleId' in owner ? `v:${owner.vehicleId}` : `e:${owner.expenseId}`;
  const [reloadCount, setReloadCount] = useState(0);
  const { data: documents, error: loadError } = useLoad(load, [ownerKey, reloadCount]);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    try {
      await action();
    } catch (err) {
      setActionError(errorMessage(err));
    }
    setReloadCount((n) => n + 1);
  }

  return {
    documents,
    loadError,
    actionError,
    ofKind: (kind: DocumentKind) => documents?.filter((d) => d.kind === kind),
    upload: (kind: DocumentKind, file: File) => run(() => uploadDocument(owner, kind, file)),
    remove: (document: DocumentWithUrl) => run(() => removeDocument(document)),
  };
}
