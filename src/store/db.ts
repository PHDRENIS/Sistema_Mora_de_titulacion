import { create } from 'zustand'
import { toast } from 'sonner'
import type {
  Asesorado,
  CambioAsignacion,
  Datos,
  DatosAsesorado,
  DatosCuenta,
  EstadoFinal,
  Notificacion,
  ProcesoExamen,
  Revision,
  SalaExamen,
  SlotExamen,
  Solicitud,
  User,
} from '@/lib/dominio'

export * from '@/lib/dominio'

interface RespuestaDatos {
  usuario?: User
  datos: Datos
  version: number
}

interface EstadoDB {
  listo: boolean
  version: number
  sesionId: string | null
  users: User[]
  asesorados: Asesorado[]
  revisiones: Revision[]
  solicitudes: Solicitud[]
  notificaciones: Notificacion[]
  slots: SlotExamen[]
  salas: SalaExamen[]
  proceso: ProcesoExamen
  examenesSinFecha: { asesoradoId: string; asignadoPor: string; liberadoEn: string }[]

  iniciarSesion: (usuario: string, contrasena: string) => Promise<boolean>
  cerrarSesion: () => Promise<void>
  sincronizar: () => Promise<void>

  crearVocal: (entrada: DatosCuenta & { carrera: string }) => Promise<User | null>
  borrarVocal: (id: string) => Promise<boolean>
  crearAsesor: (entrada: DatosCuenta) => Promise<User | null>
  crearAsesorado: (entrada: DatosAsesorado) => Promise<boolean>
  guardarAsignacion: (cambios: CambioAsignacion[]) => Promise<boolean>
  solicitarBaja: (asesoradoId: string) => Promise<boolean>
  resolverSolicitud: (solicitudId: string, aceptar: boolean) => Promise<boolean>
  agregarRevision: (asesoradoId: string, descripcion: string, archivo: File) => Promise<void>
  revisarRevision: (revisionId: string, estado: EstadoFinal, nota: string) => Promise<boolean>
  marcarLeidas: () => Promise<boolean>
  marcarLeida: (notificacionId: string) => Promise<boolean>
  generarSlots: (fechaInicio: string, fechaFin: string) => Promise<number>
  eliminarSlot: (slotId: string) => Promise<boolean>
  asignarExamen: (slotId: string, asesoradoId: string) => Promise<{ ok: boolean; error?: string }>
  liberarExamen: (slotId: string) => Promise<boolean>
  crearSala: (nombre: string) => Promise<SalaExamen | null>
  renombrarSala: (salaId: string, nombre: string) => Promise<boolean>
  eliminarSala: (salaId: string) => Promise<boolean>
  guardarProceso: (abreEn: string) => Promise<boolean>
  abrirProceso: () => Promise<boolean>
  cerrarProceso: () => Promise<boolean>
  borrarProceso: () => Promise<boolean>
  restablecerContrasena: (id: string) => Promise<User | null>
  solicitarRecuperacion: (usuario: string) => Promise<{ ok: boolean; error?: string }>
  cambiarContrasena: (nueva: string) => Promise<void>
}

const VACIOS = {
  users: [] as User[],
  asesorados: [] as Asesorado[],
  revisiones: [] as Revision[],
  solicitudes: [] as Solicitud[],
  notificaciones: [] as Notificacion[],
  slots: [] as SlotExamen[],
  salas: [] as SalaExamen[],
  proceso: { estado: 'borrador', abreEn: null } as ProcesoExamen,
  examenesSinFecha: [] as { asesoradoId: string; asignadoPor: string; liberadoEn: string }[],
}

function aplicarDatos(estado: RespuestaDatos) {
  useDB.setState({
    version: estado.version,
    sesionId: estado.usuario?.id ?? null,
    users: estado.datos.users,
    asesorados: estado.datos.asesorados,
    revisiones: estado.datos.revisiones,
    solicitudes: estado.datos.solicitudes,
    notificaciones: estado.datos.notificaciones,
    slots: estado.datos.slots,
    salas: estado.datos.salas,
    proceso: estado.datos.proceso,
    examenesSinFecha: estado.datos.examenesSinFecha,
  })
}

function limpiarSesion() {
  useDB.setState({ version: 0, sesionId: null, ...VACIOS })
}

async function pedir<T>(ruta: string, opciones: RequestInit = {}): Promise<{ ok: true; cuerpo: T } | { ok: false; error: string; estado?: number }> {
  try {
    const res = await fetch(`/api/${ruta}`, { credentials: 'same-origin', ...opciones })
    if (res.status === 401) {
      limpiarSesion()
      return { ok: false, error: 'Tu sesión expiró. Vuelve a entrar.', estado: 401 }
    }
    const cuerpo = (await res.json().catch(() => ({}))) as T & { error?: string; datos?: Datos; version?: number }
    if (!res.ok) {
      if (res.status === 409 && cuerpo.datos && typeof cuerpo.version === 'number') {
        aplicarDatos({ datos: cuerpo.datos, version: cuerpo.version })
      }
      return { ok: false, error: cuerpo.error ?? 'No se pudo completar la operación.', estado: res.status }
    }
    return { ok: true, cuerpo }
  } catch {
    return { ok: false, error: 'No hay conexión con el servidor.' }
  }
}

interface CuerpoAccion {
  datos?: Datos
  version?: number
  extra?: unknown
  error?: string
  desactualizado?: boolean
}

async function enviarAccion<T>(tipo: string, parametros: Record<string, unknown> = {}): Promise<{ ok: true; extra?: T } | { ok: false; error: string }> {
  const res = await pedir<CuerpoAccion>('accion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tipo, version: useDB.getState().version, ...parametros }),
  })
  if (!res.ok) return { ok: false, error: res.error }
  const cuerpo = res.cuerpo
  if (cuerpo.datos && typeof cuerpo.version === 'number') {
    aplicarDatos({ datos: cuerpo.datos, version: cuerpo.version })
  }
  return { ok: true, extra: cuerpo.extra as T }
}

export const useDB = create<EstadoDB>()(() => ({
  ...VACIOS,
  listo: false,
  version: 0,
  sesionId: null,

  iniciarSesion: async (usuario, contrasena) => {
    const res = await pedir<RespuestaDatos>('login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario, contrasena }),
    })
    if (!res.ok) return false
    aplicarDatos({ usuario: res.cuerpo.usuario, datos: res.cuerpo.datos, version: res.cuerpo.version })
    return true
  },

  cerrarSesion: async () => {
    await pedir('logout', { method: 'POST' })
    limpiarSesion()
  },

  sincronizar: async () => {
    const res = await pedir<RespuestaDatos>('datos')
    useDB.setState({ listo: true })
    if (!res.ok) return
    aplicarDatos({ usuario: res.cuerpo.usuario, datos: res.cuerpo.datos, version: res.cuerpo.version })
  },

  crearVocal: async (entrada) => {
    const res = await enviarAccion<{ usuario: User }>('crearVocal', { entrada })
    if (!res.ok) {
      toast.error(res.error)
      return null
    }
    return res.extra?.usuario ?? null
  },

  borrarVocal: async (id) => {
    const res = await enviarAccion('borrarVocal', { id })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  crearAsesor: async (entrada) => {
    const res = await enviarAccion<{ usuario: User }>('crearAsesor', { entrada })
    if (!res.ok) {
      toast.error(res.error)
      return null
    }
    return res.extra?.usuario ?? null
  },

  crearAsesorado: async (entrada) => {
    const res = await enviarAccion('crearAsesorado', { entrada })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  guardarAsignacion: async (cambios) => {
    const res = await enviarAccion('guardarAsignacion', { cambios })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  solicitarBaja: async (asesoradoId) => {
    const res = await enviarAccion('solicitarBaja', { asesoradoId })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  resolverSolicitud: async (solicitudId, aceptar) => {
    const res = await enviarAccion('resolverSolicitud', { solicitudId, aceptar })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  agregarRevision: async (asesoradoId, descripcion, archivo) => {
    const form = new FormData()
    form.append('archivo', archivo)
    const subida = await pedir<{ clave: string }>('archivos', { method: 'POST', body: form })
    if (!subida.ok) throw new Error(subida.error)
    const clave = subida.cuerpo.clave
    const meta = { nombre: archivo.name, tipo: archivo.type, tamano: archivo.size, clave }
    const res = await enviarAccion('agregarRevision', { asesoradoId, descripcion, archivo: meta })
    if (!res.ok) throw new Error(res.error)
  },

  revisarRevision: async (revisionId, estado, nota) => {
    const res = await enviarAccion('revisarRevision', { revisionId, estado, nota })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  marcarLeidas: async () => {
    const res = await enviarAccion('marcarLeidas')
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  marcarLeida: async (notificacionId) => {
    const res = await enviarAccion('marcarLeida', { notificacionId })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  generarSlots: async (fechaInicio, fechaFin) => {
    const res = await enviarAccion<{ creados: number }>('generarSlots', { fechaInicio, fechaFin })
    if (!res.ok) {
      toast.error(res.error)
      return -1
    }
    return res.extra?.creados ?? 0
  },

  eliminarSlot: async (slotId) => {
    const res = await enviarAccion<{ eliminado: boolean }>('eliminarSlot', { slotId })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    if (!res.extra?.eliminado) {
      toast.error('No se puede eliminar: el proceso ya está guardado o el horario está asignado.')
      return false
    }
    return true
  },

  asignarExamen: async (slotId, asesoradoId) => {
    const res = await enviarAccion('asignarExamen', { slotId, asesoradoId })
    if (!res.ok) return { ok: false, error: res.error }
    return { ok: true }
  },

  liberarExamen: async (slotId) => {
    const res = await enviarAccion<{ liberado: boolean }>('liberarExamen', { slotId })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return res.extra?.liberado ?? false
  },

  crearSala: async (nombre) => {
    const res = await enviarAccion<{ sala: SalaExamen }>('crearSala', { nombre })
    if (!res.ok) {
      toast.error(res.error)
      return null
    }
    return res.extra?.sala ?? null
  },

  renombrarSala: async (salaId, nombre) => {
    const res = await enviarAccion('renombrarSala', { salaId, nombre })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  eliminarSala: async (salaId) => {
    const res = await enviarAccion<{ eliminado: boolean }>('eliminarSala', { salaId })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return res.extra?.eliminado ?? false
  },

  guardarProceso: async (abreEn) => {
    const res = await enviarAccion('guardarProceso', { abreEn })
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  abrirProceso: async () => {
    const res = await enviarAccion('abrirProceso')
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  cerrarProceso: async () => {
    const res = await enviarAccion('cerrarProceso')
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  borrarProceso: async () => {
    const res = await enviarAccion('borrarProceso')
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    return true
  },

  restablecerContrasena: async (id) => {
    const res = await enviarAccion<{ usuario: User }>('restablecerContrasena', { id })
    if (!res.ok) {
      toast.error(res.error)
      return null
    }
    return res.extra?.usuario ?? null
  },

  solicitarRecuperacion: async (usuario) => {
    const res = await pedir<CuerpoAccion>('recuperar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario }),
    })
    if (!res.ok) return { ok: false, error: res.error }
    return { ok: true }
  },

  cambiarContrasena: async (nueva) => {
    const res = await enviarAccion('cambiarContrasena', { nueva })
    if (!res.ok) throw new Error(res.error)
  },
}))

export function useUsuarioActual(): User | null {
  return useDB((s) => s.users.find((u) => u.id === s.sesionId) ?? null)
}
