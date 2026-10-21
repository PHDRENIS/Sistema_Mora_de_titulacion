import { obtenerArchivo } from './idb'
import type { ArchivoMeta } from '@/store/db'
import { toast } from 'sonner'

export async function descargarArchivo(archivo: ArchivoMeta) {
  let blob = await obtenerArchivo(archivo.clave)
  if (!blob) {
    blob = new Blob(
      [`Documento de ejemplo (${archivo.nombre})\n\nEste archivo pertenece a los datos de prueba de la demo, por lo que no tiene contenido real.\nLos documentos que subas en la app sí se guardan y descargan tal cual.`],
      { type: 'text/plain;charset=utf-8' },
    )
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = archivo.nombre
  a.click()
  URL.revokeObjectURL(url)
}

export async function descargarRevisionConToast(archivo: ArchivoMeta) {
  try {
    await descargarArchivo(archivo)
  } catch {
    toast.error('No se pudo descargar el archivo.')
  }
}
