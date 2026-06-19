// High-resolution chart images live in IndexedDB (large quota), keyed by analysis id.
// localStorage only keeps a tiny list thumbnail + the analysis text.

const DB_NAME = 'stockai-images';
const STORE = 'charts';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('no idb')); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putChartImage(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(dataUrl, id);
      tx.oncomplete = () => res();
      tx.onerror = () => rej(tx.error);
    });
  } catch { /* best-effort */ }
}

export async function getChartImage(id: string): Promise<string | null> {
  try {
    const db = await openDB();
    return await new Promise<string | null>((res) => {
      const tx = db.transaction(STORE, 'readonly');
      const g = tx.objectStore(STORE).get(id);
      g.onsuccess = () => res((g.result as string) || null);
      g.onerror = () => res(null);
    });
  } catch { return null; }
}

export async function deleteChartImage(id: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch { /* ignore */ }
}

export async function clearChartImages(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((res) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
  } catch { /* ignore */ }
}
