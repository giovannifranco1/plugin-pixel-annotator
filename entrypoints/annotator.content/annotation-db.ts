import type { Annotation } from '@/lib/types'
import type { PersistBackend, PersistBatch, StoreMeta, StoreSnapshot } from '@/lib/persist'

/**
 * Anotações salvas no IndexedDB do próprio site (PERS-01): sobrevivem a refresh, navegação e ao
 * fechar o navegador; saem com "Limpar tudo" ou excluindo cada uma.
 * IndexedDB e não `storage.local`: guarda os prints como Blob, sem base64 e sem limite de 10 MB.
 * Efeito colateral aceito: o JavaScript do site consegue ler esse banco (é a origem dele).
 */
const DB_NAME = 'pxa-annotator'
const VERSION = 1
const ITEMS = 'annotations'
const META = 'meta'
const META_KEY = 'store'

const done = (req: IDBRequest | IDBTransaction) =>
  new Promise<void>((resolve, reject) => {
    if ('oncomplete' in req) {
      req.oncomplete = () => resolve()
      req.onabort = req.onerror = () => reject(req.error)
    } else {
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
    }
  })

function open(idb: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = idb.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    req.onblocked = () => reject(new Error('IndexedDB bloqueado'))
  })
}

export interface AnnotationDb extends PersistBackend {
  load(): Promise<StoreSnapshot>
}

export async function openAnnotationDb(idb: IDBFactory = indexedDB): Promise<AnnotationDb> {
  const db = await open(idb)
  return {
    async load() {
      const tx = db.transaction([ITEMS, META], 'readonly')
      const itemsReq = tx.objectStore(ITEMS).getAll() as IDBRequest<Annotation[]>
      const metaReq = tx.objectStore(META).get(META_KEY) as IDBRequest<StoreMeta | undefined>
      await done(tx)
      return { items: itemsReq.result, meta: metaReq.result ?? { nextNumber: 1, dirty: false } }
    },
    async write({ put, del, meta }: PersistBatch) {
      const tx = db.transaction([ITEMS, META], 'readwrite')
      const items = tx.objectStore(ITEMS)
      for (const a of put) items.put(a)
      for (const id of del) items.delete(id)
      tx.objectStore(META).put(meta, META_KEY)
      await done(tx)
    },
  }
}
