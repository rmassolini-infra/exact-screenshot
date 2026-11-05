import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { Review } from './types';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const MAX_BYTES = 25 * 1024 * 1024;

/** Sempre passa uma cópia: pdf.js transfere (desanexa) o buffer recebido. */
export function openPdf(bytes: Uint8Array) {
  return pdfjs.getDocument({ data: bytes.slice(), verbosity: 0 });
}

// ---------- IndexedDB (salvo neste navegador) ----------
export interface SavedState {
  source: 'BR01' | 'upload';
  fileName: string;
  bytes?: ArrayBuffer; // somente para PDF do usuário; nunca enviado a servidor
  mode: 'p3' | 'full';
  reviews: Review[];
  savedAt: string;
}

const DB = 'duedd-ambiental', STORE = 'kv', KEY = 'current';

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    let r: IDBOpenDBRequest;
    try { r = indexedDB.open(DB, 1); } catch (e) { rej(e); return; }
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error ?? new Error('Falha ao abrir o armazenamento do navegador.'));
    r.onblocked = () => rej(new Error('Armazenamento do navegador bloqueado por outra aba.'));
  });
}

/** Resolve só quando a transação completa (oncomplete); rejeita em onerror/onabort. Sempre fecha o banco. */
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((res, rej) => {
      let result: T;
      let t: IDBTransaction;
      try {
        t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => { result = req.result; };
      } catch (e) { rej(e); return; }
      t.oncomplete = () => res(result);
      t.onerror = () => rej(t.error ?? new Error('Erro na transação do armazenamento.'));
      t.onabort = () => rej(t.error ?? new Error('Transação do armazenamento abortada (possível falta de espaço).'));
    });
  } finally { db.close(); }
}

export const loadState = () => tx<SavedState | undefined>('readonly', (s) => s.get(KEY));
export const saveState = (v: SavedState) => tx('readwrite', (s) => s.put(v, KEY));
export const clearState = () => tx('readwrite', (s) => s.delete(KEY));

export function storageErrorMessage(e: unknown): string {
  const name = (e as any)?.name ?? '';
  if (name === 'QuotaExceededError') return 'Espaço de armazenamento do navegador esgotado.';
  return (e as any)?.message || String(e);
}
