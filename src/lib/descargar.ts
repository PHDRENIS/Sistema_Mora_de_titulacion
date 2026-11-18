import type { ArchivoMeta } from '@/store/db'
import { toast } from 'sonner'

export async function descargarArchivo(archivo: ArchivoMeta) {
  const res = await fetch(`/api/archivos/${encodeURIComponent(archivo.clave)}`, { credentials: 'same-origin' })
  if (!res.ok) throw new Error('No se pudo descargar el archivo.')
  const blob = await res.blob()
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
