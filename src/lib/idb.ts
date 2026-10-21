const NOMBRE_DB = 'titulacion-archivos'
const ALMACEN = 'archivos'

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOMBRE_DB, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(ALMACEN)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function conAlmacen<T>(modo: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(ALMACEN, modo)
    const req = fn(tx.objectStore(ALMACEN))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export function guardarArchivo(blob: Blob): Promise<string> {
  const clave = `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
  return conAlmacen('readwrite', (store) => store.put(blob, clave)).then(() => clave)
}

export function obtenerArchivo(clave: string): Promise<Blob | undefined> {
  return conAlmacen<Blob | undefined>('readonly', (store) => store.get(clave))
}

export function eliminarArchivo(clave: string): Promise<void> {
  return conAlmacen('readwrite', (store) => store.delete(clave)).then(() => undefined)
}
