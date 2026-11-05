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
function db(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((res, rej) => {
    const req = fn(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
export const loadState = () => tx<SavedState | undefined>('readonly', (s) => s.get(KEY));
export const saveState = (v: SavedState) => tx('readwrite', (s) => s.put(v, KEY));
export const clearState = () => tx('readwrite', (s) => s.delete(KEY));
