import { IDB_NAME, IDB_VERSION } from '../../domain/presets';

export type StoreName = 'inputs' | 'outputs';

export class IndexedDbClient {
  private readonly dbName: string;
  private readonly dbVersion: number;
  private readonly factory: IDBFactory;
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor(
    dbName: string = IDB_NAME,
    dbVersion: number = IDB_VERSION,
    factory: IDBFactory = globalThis.indexedDB,
  ) {
    this.dbName = dbName;
    this.dbVersion = dbVersion;
    this.factory = factory;
  }

  open(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
        const req = this.factory.open(this.dbName, this.dbVersion);
        req.onupgradeneeded = () => {
          const database = req.result;
          if (!database.objectStoreNames.contains('inputs')) {
            database.createObjectStore('inputs', { keyPath: 'id' });
          }
          if (!database.objectStoreNames.contains('outputs')) {
            const outStore = database.createObjectStore('outputs', { keyPath: 'id' });
            outStore.createIndex('by_inputId', 'inputId', { unique: false });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          this.dbPromise = null;
          reject(req.error ?? new Error('Failed to open IndexedDB'));
        };
      });
    }
    return this.dbPromise;
  }

  async getAll<T>(storeName: StoreName): Promise<T[]> {
    const db = await this.open();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getByKey<T>(storeName: StoreName, key: IDBValidKey): Promise<T | undefined> {
    const db = await this.open();
    return new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllByIndex<T>(
    storeName: StoreName,
    indexName: string,
    key: IDBValidKey,
  ): Promise<T[]> {
    const db = await this.open();
    return new Promise<T[]>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).index(indexName).getAll(key);
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  async put<T>(storeName: StoreName, value: T): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async delete(storeName: StoreName, id: IDBValidKey): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteByIndex(
    storeName: StoreName,
    indexName: string,
    key: IDBValidKey,
  ): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const index = store.index(indexName);
      const cursorReq = index.openKeyCursor(IDBKeyRange.only(key));
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          store.delete(cursor.primaryKey);
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clear(storeName: StoreName): Promise<void> {
    const db = await this.open();
    return new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async close(): Promise<void> {
    if (!this.dbPromise) return;
    const db = await this.dbPromise;
    db.close();
    this.dbPromise = null;
  }
}
