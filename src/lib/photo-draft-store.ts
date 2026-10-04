import type { PhotoAnalysis } from "@/lib/photo-quality";

// /publicar keeps the chosen photos and their room labels in this browser (IndexedDB), so a reload
// does not lose them. Private windows, blocked storage or old browsers simply skip it: every call
// catches its errors and the form keeps working without it.
// The list (order, room labels, checks) is small and saved on every change; each photo's bytes
// are saved once, under their own key.

export type DraftPhotoMeta = {
  id: string;
  sourceKey: string;
  name: string;
  type: string;
  category: string;
  analysis: Omit<PhotoAnalysis, "previewUrl"> | null;
};
export type DraftPhoto = DraftPhotoMeta & { file: Blob; preview: Blob | null };

const databaseName = "zu-publicar";
const storeName = "fotos";

const listKey = (key: string) => `${key}:lista`;
const photoKey = (key: string, id: string) => `${key}:foto:${id}`;

function openDatabase(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") return resolve(null);
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

// Runs the operations in one transaction; resolves false instead of throwing.
async function transact(mode: IDBTransactionMode, operations: (store: IDBObjectStore) => void): Promise<boolean> {
  const database = await openDatabase();
  if (!database) return false;
  return new Promise((resolve) => {
    try {
      const transaction = database.transaction(storeName, mode);
      transaction.oncomplete = () => { database.close(); resolve(true); };
      transaction.onerror = () => { database.close(); resolve(false); };
      transaction.onabort = () => { database.close(); resolve(false); };
      operations(transaction.objectStore(storeName));
    } catch {
      database.close();
      resolve(false);
    }
  });
}

export async function saveDraftPhotoList(key: string, photos: DraftPhotoMeta[]) {
  try {
    return await transact("readwrite", (store) => { store.put({ savedAt: Date.now(), photos }, listKey(key)); });
  } catch {
    return false;
  }
}

export async function saveDraftPhotoFiles(key: string, files: { id: string; file: Blob; preview: Blob | null }[]) {
  if (!files.length) return true;
  try {
    return await transact("readwrite", (store) => {
      for (const item of files) store.put({ file: item.file, preview: item.preview }, photoKey(key, item.id));
    });
  } catch {
    return false;
  }
}

export async function deleteDraftPhotoFiles(key: string, ids: string[]) {
  if (!ids.length) return;
  try {
    await transact("readwrite", (store) => { for (const id of ids) store.delete(photoKey(key, id)); });
  } catch {
    // A leftover photo is ignored: only the ones in the list are loaded.
  }
}

export async function loadDraftPhotos(key: string): Promise<DraftPhoto[]> {
  try {
    const database = await openDatabase();
    if (!database) return [];
    return await new Promise<DraftPhoto[]>((resolve) => {
      const found: DraftPhoto[] = [];
      try {
        const transaction = database.transaction(storeName, "readonly");
        const store = transaction.objectStore(storeName);
        // Requests are chained from callbacks so the transaction stays open in every browser.
        const list = store.get(listKey(key));
        list.onsuccess = () => {
          const metas = Array.isArray(list.result?.photos) ? (list.result.photos as DraftPhotoMeta[]) : [];
          metas.forEach((photo, index) => {
            if (!photo || typeof photo.id !== "string" || typeof photo.name !== "string") return;
            const request = store.get(photoKey(key, photo.id));
            request.onsuccess = () => {
              const stored = request.result as { file?: unknown; preview?: unknown } | undefined;
              if (stored?.file instanceof Blob) found[index] = { ...photo, file: stored.file, preview: stored.preview instanceof Blob ? stored.preview : null };
            };
          });
        };
        transaction.oncomplete = () => { database.close(); resolve(found.filter(Boolean)); };
        transaction.onerror = () => { database.close(); resolve([]); };
        transaction.onabort = () => { database.close(); resolve([]); };
      } catch {
        database.close();
        resolve([]);
      }
    });
  } catch {
    return [];
  }
}

export async function clearDraftPhotos(key: string) {
  try {
    await transact("readwrite", (store) => {
      store.delete(listKey(key));
      store.delete(IDBKeyRange.bound(photoKey(key, ""), photoKey(key, "￿")));
    });
  } catch {
    // Nothing to clean up if the browser has no storage.
  }
}

// True when this browser can keep photos across a reload.
export async function draftPhotosAvailable() {
  try {
    const database = await openDatabase();
    database?.close();
    return Boolean(database);
  } catch {
    return false;
  }
}
