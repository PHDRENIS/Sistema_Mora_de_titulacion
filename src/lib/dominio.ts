import { fechaCorta, horaLegible } from './format'

export type Rol = 'admin' | 'vocal' | 'asesor'

export interface User {
  id: string
  rol: Rol
  nombre: string
  correo: string
  carrera?: string
  creadoEn: string
  contrasena?: string
  hash?: string
}

export type PuestoSinodal = 'presidente' | 'vocal' | 'secretario' | 'suplente'

export const PUESTOS_SINODAL: { valor: PuestoSinodal; etiqueta: string }[] = [
  { valor: 'presidente', etiqueta: 'Presidente' },
  { valor: 'vocal', etiqueta: 'Vocal' },
  { valor: 'secretario', etiqueta: 'Secretario' },
  { valor: 'suplente', etiqueta: 'Suplente' },
]

export function etiquetaPuesto(puesto: PuestoSinodal): string {
  return PUESTOS_SINODAL.find((p) => p.valor === puesto)?.etiqueta ?? puesto
}

export interface AsignacionAsesor {
  asesorId: string
  puesto: PuestoSinodal
}

export interface Asesorado {
  id: string
  asignaciones: AsignacionAsesor[]
  nombre: string
  matricula: string
  correo: string
  carrera: string
  creadoEn: string
}

export type EstadoRevision = 'pendiente' | 'aceptada' | 'con_observaciones' | 'rechazada'

export interface ArchivoMeta {
  nombre: string
  tipo: string
  tamano: number
  clave: string
}

export interface Revision {
  id: string
  asesoradoId: string
  numero: number
  fecha: string
  descripcion: string
  archivo: ArchivoMeta
  estado: EstadoRevision
  nota?: string
  revisadoEn?: string
}

export interface Solicitud {
  id: string
  asesoradoId: string
  solicitadoPor: string
  estado: 'pendiente' | 'aceptada' | 'rechazada'
  creadoEn: string
  resueltoPor?: string
  resueltoEn?: string
}

export type TipoNotificacion = 'asignacion' | 'solicitud_baja' | 'solicitud_resuelta' | 'revision_revisada' | 'examen_asignado' | 'agenda_examen' | 'recuperacion'

export interface Notificacion {
  id: string
  para: string
  tipo: TipoNotificacion
  mensaje: string
  leida: boolean
  creadoEn: string
}

export interface SlotExamen {
  id: string
  fecha: string
  horaInicio: string
  duracionMin: number
  salaId: string
  asesoradoId?: string
  asignadoPor?: string
  asignadoEn?: string
}

export const DURACION_EXAMEN = 120

export interface TurnoExamen {
  nombre: 'Matutino' | 'Vespertino' | 'Sábado'
  inicio: string
  fin: string
  horas: string[]
}

export const TURNOS_ENTRE_SEMANA: TurnoExamen[] = [
  { nombre: 'Matutino', inicio: '07:00', fin: '13:00', horas: ['07:00', '09:00', '11:00'] },
  { nombre: 'Vespertino', inicio: '14:00', fin: '20:00', horas: ['14:00', '16:00', '18:00'] },
]

export const TURNO_SABADO: TurnoExamen = { nombre: 'Sábado', inicio: '08:00', fin: '14:00', horas: ['08:00', '10:00', '12:00'] }

export function turnosDeDia(diaSemana: number): TurnoExamen[] {
  if (diaSemana === 0) return []
  if (diaSemana === 6) return [TURNO_SABADO]
  return TURNOS_ENTRE_SEMANA
}

export function turnoDeSlot(fecha: string, horaInicio: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  const turnos = turnosDeDia(new Date(y, m - 1, d).getDay())
  return turnos.find((t) => t.horas.includes(horaInicio))?.nombre ?? 'Examen'
}

export interface SalaExamen {
  id: string
  numero: number
  nombre: string
}

export type EstadoProceso = 'borrador' | 'guardado' | 'cerrado'

export interface ProcesoExamen {
  estado: EstadoProceso
  abreEn: string | null
}

export interface ExamenSinFecha {
  asesoradoId: string
  asignadoPor: string
  liberadoEn: string
}

export type EstadoFinal = Exclude<EstadoRevision, 'pendiente'>

export interface Datos {
  users: User[]
  asesorados: Asesorado[]
  revisiones: Revision[]
  solicitudes: Solicitud[]
  notificaciones: Notificacion[]
  slots: SlotExamen[]
  salas: SalaExamen[]
  proceso: ProcesoExamen
  examenesSinFecha: ExamenSinFecha[]
}

export interface Actor {
  id: string
  rol: Rol
  nombre: string
  carrera?: string
}

export type Resultado<T = undefined> = { ok: true; datos: Datos; extra?: T } | { ok: false; error: string }

export interface DatosCuenta {
  nombre: string
  correo: string
}

export interface DatosAsesorado {
  nombre: string
  matricula: string
  correo: string
  carrera: string
}

export interface CambioAsignacion {
  asesoradoId: string
  asignaciones: AsignacionAsesor[]
}

export function nuevoId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function generarContrasena(): string {
  const minus = 'abcdefghjkmnpqrstuvwxyz'
  const mayus = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digitos = '23456789'
  const aleatorio = crypto.getRandomValues(new Uint32Array(8))
  let i = 0
  const tomar = (set: string, n: number) =>
    Array.from({ length: n }, () => set[aleatorio[i++ % aleatorio.length] % set.length]).join('')
  return [tomar(minus, 4), tomar(mayus, 1), tomar(digitos, 2), tomar(minus, 1)]
    .sort(() => Math.random() - 0.5)
    .join('')
}

const ITERACIONES_PBKDF2 = 100000

function aBase64(bytes: Uint8Array): string {
  let binario = ''
  for (const b of bytes) binario += String.fromCharCode(b)
  return btoa(binario)
}

function deBase64(texto: string): Uint8Array {
  const binario = atob(texto)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return bytes
}

async function derivar(contrasena: string, sal: Uint8Array, iteraciones: number): Promise<Uint8Array> {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(contrasena), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: sal as BufferSource, iterations: iteraciones },
    clave,
    256,
  )
  return new Uint8Array(bits)
}

export async function hashContrasena(contrasena: string): Promise<string> {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derivar(contrasena, sal, ITERACIONES_PBKDF2)
  return `pbkdf2$${ITERACIONES_PBKDF2}$${aBase64(sal)}$${aBase64(hash)}`
}

export async function verificarContrasena(contrasena: string, almacenado: string): Promise<boolean> {
  const partes = almacenado.split('$')
  if (partes.length !== 4 || partes[0] !== 'pbkdf2') return false
  const iteraciones = Number(partes[1])
  if (!Number.isFinite(iteraciones) || iteraciones <= 0) return false
  const hash = await derivar(contrasena, deBase64(partes[2]), iteraciones)
  const esperado = deBase64(partes[3])
  if (hash.length !== esperado.length) return false
  let diferencia = 0
  for (let i = 0; i < hash.length; i++) diferencia |= hash[i] ^ esperado[i]
  return diferencia === 0
}

export function estadoInicial(admin: User): Datos {
  return {
    users: [admin],
    asesorados: [],
    revisiones: [],
    solicitudes: [],
    notificaciones: [],
    slots: [],
    salas: [],
    proceso: { estado: 'borrador', abreEn: null },
    examenesSinFecha: [],
  }
}

export function listaNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

function notificacion(para: string, tipo: TipoNotificacion, mensaje: string, leida = false, creadoEn = new Date().toISOString()): Notificacion {
  return { id: nuevoId(), para, tipo, mensaje, leida, creadoEn }
}

function clonar(d: Datos, cambios: Partial<Datos>): Datos {
  return { ...d, ...cambios }
}

export function crearVocal(
  d: Datos,
  actor: Actor,
  entrada: DatosCuenta & { carrera: string },
): Resultado<{ usuario: User }> {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador puede crear vocales.' }
  const correo = entrada.correo.trim().toLowerCase()
  if (d.users.some((u) => u.correo === correo)) return { ok: false, error: 'Ya existe una cuenta con ese correo.' }
  const user: User = {
    id: nuevoId(),
    rol: 'vocal',
    nombre: entrada.nombre.trim(),
    correo,
    contrasena: generarContrasena(),
    carrera: entrada.carrera.trim(),
    creadoEn: new Date().toISOString(),
  }
  return { ok: true, datos: clonar(d, { users: [...d.users, user] }), extra: { usuario: user } }
}

export function borrarVocal(d: Datos, actor: Actor, id: string): Resultado {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador puede eliminar vocales.' }
  return { ok: true, datos: clonar(d, { users: d.users.filter((u) => u.id !== id || u.rol !== 'vocal') }) }
}

export function crearAsesor(d: Datos, actor: Actor, entrada: DatosCuenta): Resultado<{ usuario: User }> {
  if (actor.rol !== 'admin' && actor.rol !== 'vocal') return { ok: false, error: 'No tienes permiso para crear asesores.' }
  const correo = entrada.correo.trim().toLowerCase()
  if (d.users.some((u) => u.correo === correo)) return { ok: false, error: 'Ya existe una cuenta con ese correo.' }
  const user: User = {
    id: nuevoId(),
    rol: 'asesor',
    nombre: entrada.nombre.trim(),
    correo,
    contrasena: generarContrasena(),
    creadoEn: new Date().toISOString(),
  }
  return { ok: true, datos: clonar(d, { users: [...d.users, user] }), extra: { usuario: user } }
}

export function crearAsesorado(d: Datos, actor: Actor, entrada: DatosAsesorado): Resultado {
  if (actor.rol === 'asesor') return { ok: false, error: 'No tienes permiso para crear asesorados.' }
  const carrera = entrada.carrera.trim()
  if (actor.rol === 'vocal' && carrera !== actor.carrera) {
    return { ok: false, error: 'Solo puedes dar de alta asesorados de tu carrera.' }
  }
  const asesorado: Asesorado = {
    id: nuevoId(),
    asignaciones: [],
    nombre: entrada.nombre.trim(),
    matricula: entrada.matricula.trim(),
    correo: entrada.correo.trim().toLowerCase(),
    carrera,
    creadoEn: new Date().toISOString(),
  }
  return { ok: true, datos: clonar(d, { asesorados: [...d.asesorados, asesorado] }) }
}

export function guardarAsignacion(d: Datos, actor: Actor, cambios: CambioAsignacion[]): Resultado {
  if (actor.rol !== 'admin' && actor.rol !== 'vocal') {
    return { ok: false, error: 'No tienes permiso para asignar sínodos.' }
  }
  for (const cambio of cambios) {
    const actual = d.asesorados.find((a) => a.id === cambio.asesoradoId)
    if (!actual) return { ok: false, error: 'No se encontró uno de los asesorados.' }
    if (actor.rol === 'vocal' && actual.carrera !== actor.carrera) {
      return { ok: false, error: `Solo puedes asignar el sínodo de ${actual.nombre} si es de tu carrera.` }
    }
  }
  let asesorados = d.asesorados
  let notificaciones = d.notificaciones
  for (const cambio of cambios) {
    const actual = asesorados.find((a) => a.id === cambio.asesoradoId)
    if (!actual) continue
    const previas = new Map(actual.asignaciones.map((x) => [x.puesto, x.asesorId]))
    const nuevas = new Map(cambio.asignaciones.filter((x) => x.asesorId).map((x) => [x.puesto, x.asesorId as string]))
    for (const [puesto, asesorIdPrevio] of previas) {
      if (nuevas.get(puesto) !== asesorIdPrevio) {
        notificaciones = [
          ...notificaciones,
          notificacion(
            asesorIdPrevio,
            'asignacion',
            `Ya no eres ${etiquetaPuesto(puesto)} del sínodo de ${actual.nombre} (${actual.carrera}).`,
          ),
        ]
      }
    }
    for (const [puesto, asesorIdNuevo] of nuevas) {
      if (previas.get(puesto) !== asesorIdNuevo) {
        notificaciones = [
          ...notificaciones,
          notificacion(
            asesorIdNuevo,
            'asignacion',
            `Te asignaron como ${etiquetaPuesto(puesto)} del sínodo de ${actual.nombre} (${actual.carrera}).`,
          ),
        ]
      }
    }
    asesorados = asesorados.map((a) =>
      a.id === cambio.asesoradoId ? { ...a, asignaciones: cambio.asignaciones.filter((x) => x.asesorId) } : a,
    )
  }
  return { ok: true, datos: clonar(d, { asesorados, notificaciones }) }
}

export function solicitarBaja(d: Datos, actor: Actor, asesoradoId: string): Resultado {
  const asesorado = d.asesorados.find((a) => a.id === asesoradoId)
  if (!asesorado) return { ok: false, error: 'No se encontró el asesorado.' }
  const asignado = asesorado.asignaciones.some((x) => x.asesorId === actor.id)
  if (actor.rol === 'asesor' && !asignado) {
    return { ok: false, error: 'Solo un asesor asignado a este asesorado puede solicitar la baja.' }
  }
  if (actor.rol === 'vocal') return { ok: false, error: 'Las bajas las solicita el asesor asignado.' }
  const solicitud: Solicitud = {
    id: nuevoId(),
    asesoradoId,
    solicitadoPor: actor.id,
    estado: 'pendiente',
    creadoEn: new Date().toISOString(),
  }
  const admin = d.users.find((u) => u.rol === 'admin')
  const notificaciones = admin
    ? [...d.notificaciones, notificacion(admin.id, 'solicitud_baja', `${actor.nombre} solicita la baja de ${asesorado.nombre}.`)]
    : d.notificaciones
  return { ok: true, datos: clonar(d, { solicitudes: [...d.solicitudes, solicitud], notificaciones }) }
}

export function resolverSolicitud(d: Datos, actor: Actor, solicitudId: string, aceptar: boolean): Resultado<{ archivosAEliminar: string[] }> {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador resuelve las solicitudes.' }
  const sol = d.solicitudes.find((x) => x.id === solicitudId)
  if (!sol || sol.estado !== 'pendiente') return { ok: false, error: 'La solicitud ya no está pendiente.' }
  const asesorado = d.asesorados.find((a) => a.id === sol.asesoradoId)
  if (!asesorado) return { ok: false, error: 'No se encontró el asesorado.' }
  const ahora = new Date().toISOString()
  const resuelta: Solicitud = { ...sol, estado: aceptar ? 'aceptada' : 'rechazada', resueltoPor: actor.id, resueltoEn: ahora }
  const solicitudes = d.solicitudes.map((x) => (x.id === sol.id ? resuelta : x))
  let asesorados = d.asesorados
  let revisiones = d.revisiones
  const archivosAEliminar: string[] = []
  if (aceptar) {
    const claves = d.revisiones.filter((r) => r.asesoradoId === asesorado.id).map((r) => r.archivo.clave)
    asesorados = d.asesorados.filter((a) => a.id !== asesorado.id)
    revisiones = d.revisiones.filter((r) => r.asesoradoId !== asesorado.id)
    archivosAEliminar.push(...claves)
  }
  const mensaje = aceptar
    ? `Tu baja de ${asesorado.nombre} fue aceptada por ${actor.nombre}; el asesorado se eliminó junto con sus revisiones.`
    : `Tu baja de ${asesorado.nombre} fue rechazada por ${actor.nombre}; el asesorado sigue activo.`
  const notificaciones = [...d.notificaciones, notificacion(sol.solicitadoPor, 'solicitud_resuelta', mensaje)]
  return {
    ok: true,
    datos: clonar(d, { solicitudes, asesorados, revisiones, notificaciones }),
    extra: { archivosAEliminar },
  }
}

export function agregarRevision(
  d: Datos,
  actor: Actor,
  entrada: { asesoradoId: string; descripcion: string; archivo: ArchivoMeta },
): Resultado {
  const asesorado = d.asesorados.find((a) => a.id === entrada.asesoradoId)
  if (!asesorado) return { ok: false, error: 'No se encontró el asesorado.' }
  const asignado = asesorado.asignaciones.some((x) => x.asesorId === actor.id)
  if (actor.rol === 'asesor' && !asignado) {
    return { ok: false, error: 'Solo un asesor asignado a este asesorado puede subir revisiones.' }
  }
  if (actor.rol === 'vocal') return { ok: false, error: 'Las revisiones las sube el asesor asignado.' }
  const previas = d.revisiones.filter((r) => r.asesoradoId === entrada.asesoradoId)
  const revision: Revision = {
    id: nuevoId(),
    asesoradoId: entrada.asesoradoId,
    numero: previas.reduce((max, r) => Math.max(max, r.numero), 0) + 1,
    fecha: new Date().toISOString(),
    descripcion: entrada.descripcion.trim(),
    archivo: entrada.archivo,
    estado: 'pendiente',
  }
  return { ok: true, datos: clonar(d, { revisiones: [...d.revisiones, revision] }) }
}

export function revisarRevision(d: Datos, actor: Actor, revisionId: string, estado: EstadoFinal, nota: string): Resultado {
  const rev = d.revisiones.find((r) => r.id === revisionId)
  if (!rev) return { ok: false, error: 'No se encontró la revisión.' }
  if (actor.rol === 'asesor') return { ok: false, error: 'Los asesores no pueden revisar entregas.' }
  const asesorado = d.asesorados.find((a) => a.id === rev.asesoradoId)
  if (actor.rol === 'vocal' && asesorado && asesorado.carrera !== actor.carrera) {
    return { ok: false, error: 'Solo puedes revisar asesorados de tu carrera.' }
  }
  const revisiones = d.revisiones.map((r) =>
    r.id === revisionId ? { ...r, estado, nota: nota.trim() || undefined, revisadoEn: new Date().toISOString() } : r,
  )
  const etiqueta: Record<EstadoFinal, string> = {
    aceptada: 'aceptada',
    con_observaciones: 'marcada con observaciones',
    rechazada: 'rechazada',
  }
  const mensaje = `Tu revisión ${rev.numero} de ${asesorado?.nombre ?? ''} quedó ${etiqueta[estado]} por ${actor.nombre}.${nota.trim() ? ` Nota: "${nota.trim()}"` : ''}`
  const avisos = (asesorado?.asignaciones ?? []).map((x) => notificacion(x.asesorId, 'revision_revisada', mensaje))
  return { ok: true, datos: clonar(d, { revisiones, notificaciones: avisos.length ? [...d.notificaciones, ...avisos] : d.notificaciones }) }
}

export function marcarLeidas(d: Datos, actor: Actor): Resultado {
  return {
    ok: true,
    datos: clonar(d, { notificaciones: d.notificaciones.map((n) => (n.para === actor.id ? { ...n, leida: true } : n)) }),
  }
}

export function marcarLeida(d: Datos, actor: Actor, notificacionId: string): Resultado {
  const n = d.notificaciones.find((x) => x.id === notificacionId && x.para === actor.id)
  if (!n) return { ok: false, error: 'No se encontró la notificación.' }
  return {
    ok: true,
    datos: clonar(d, { notificaciones: d.notificaciones.map((x) => (x.id === notificacionId ? { ...x, leida: true } : x)) }),
  }
}

export function generarSlots(d: Datos, actor: Actor, fechaInicio: string, fechaFin: string): Resultado<{ creados: number }> {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona el calendario de exámenes.' }
  if (d.proceso.estado !== 'borrador') return { ok: false, error: 'El proceso está guardado; bórralo para definir otro calendario.' }
  if (d.salas.length === 0) return { ok: false, error: 'Crea al menos una sala antes de generar horarios.' }
  const [y1, m1, d1] = fechaInicio.split('-').map(Number)
  const [y2, m2, d2] = fechaFin.split('-').map(Number)
  const diaInicio = new Date(y1, m1 - 1, d1)
  const diaFin = new Date(y2, m2 - 1, d2)
  const fechas: { fecha: string; horas: string[] }[] = []
  for (let dia = diaInicio; dia <= diaFin; dia.setDate(dia.getDate() + 1)) {
    const horas = turnosDeDia(dia.getDay()).flatMap((t) => t.horas)
    if (horas.length === 0) continue
    fechas.push({
      fecha: `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`,
      horas,
    })
  }
  const existentes = new Set(d.slots.map((x) => `${x.fecha} ${x.horaInicio} ${x.salaId}`))
  const nuevos = d.salas
    .flatMap((sala) =>
      fechas
        .flatMap((f) =>
          f.horas
            .filter((h) => !existentes.has(`${f.fecha} ${h} ${sala.id}`))
            .map((h): SlotExamen => ({ id: nuevoId(), fecha: f.fecha, horaInicio: h, duracionMin: DURACION_EXAMEN, salaId: sala.id })),
        ),
    )
  return { ok: true, datos: clonar(d, { slots: [...d.slots, ...nuevos] }), extra: { creados: nuevos.length } }
}

export function eliminarSlot(d: Datos, actor: Actor, slotId: string): Resultado<{ eliminado: boolean }> {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona el calendario de exámenes.' }
  const slot = d.slots.find((x) => x.id === slotId)
  if (!slot || slot.asesoradoId || d.proceso.estado !== 'borrador') {
    return { ok: true, datos: d, extra: { eliminado: false } }
  }
  return {
    ok: true,
    datos: clonar(d, { slots: d.slots.filter((x) => x.id !== slotId) }),
    extra: { eliminado: true },
  }
}

export function asignarExamen(d: Datos, actor: Actor, slotId: string, asesoradoId: string): Resultado {
  const slot = d.slots.find((x) => x.id === slotId)
  const asesorado = d.asesorados.find((a) => a.id === asesoradoId)
  if (!slot || !asesorado) return { ok: false, error: 'No se encontró el horario o el asesorado.' }
  if (!procesoAbierto(d)) return { ok: false, error: 'El proceso no está abierto para asignaciones.' }
  if (slot.asesoradoId) return { ok: false, error: 'Ese horario acaba de ser ocupado. Elige otro.' }
  if (actor.rol !== 'admin' && asesorado.carrera !== actor.carrera) {
    return { ok: false, error: 'El asesorado no pertenece a tu carrera.' }
  }
  if (d.slots.some((x) => x.asesoradoId === asesoradoId)) {
    return { ok: false, error: 'Ese asesorado ya tiene un examen asignado.' }
  }
  const puestosCandidato = new Map(asesorado.asignaciones.map((x) => [x.asesorId, x.puesto]))
  const conflictos: { asesorId: string; nombreAsesor: string; puesto: PuestoSinodal; otro: string }[] = []
  if (puestosCandidato.size > 0) {
    for (const x of d.slots) {
      if (!x.asesoradoId || x.asesoradoId === asesoradoId) continue
      if (x.fecha !== slot.fecha || x.horaInicio !== slot.horaInicio) continue
      const otro = d.asesorados.find((a) => a.id === x.asesoradoId)
      if (!otro) continue
      for (const sinodal of otro.asignaciones) {
        if (conflictos.some((c) => c.asesorId === sinodal.asesorId)) continue
        if (!puestosCandidato.has(sinodal.asesorId)) continue
        conflictos.push({
          asesorId: sinodal.asesorId,
          nombreAsesor: d.users.find((u) => u.id === sinodal.asesorId)?.nombre ?? sinodal.asesorId,
          puesto: sinodal.puesto,
          otro: otro.nombre,
        })
      }
    }
  }
  if (conflictos.length > 0) {
    const miembros = listaNombres(conflictos.map((c) => `${c.nombreAsesor} (${etiquetaPuesto(c.puesto)})`))
    const otros = listaNombres([...new Set(conflictos.map((c) => c.otro))])
    return {
      ok: false,
      error: `Conflicto de horarios con estos miembros del sínodo: ${miembros}. Ya tienen examen ese día a esa misma hora (${otros}).`,
    }
  }
  const ahora = new Date().toISOString()
  const sala = d.salas.find((x) => x.id === slot.salaId)
  const mensaje = `${asesorado.nombre} tiene examen profesional el ${fechaCorta(slot.fecha)} a las ${slot.horaInicio} en ${salaEtiqueta(sala)}.`
  const avisos = asesorado.asignaciones.map((x) => notificacion(x.asesorId, 'examen_asignado', mensaje))
  const slots = d.slots.map((x) =>
    x.id === slotId && !x.asesoradoId ? { ...x, asesoradoId, asignadoPor: actor.id, asignadoEn: ahora } : x,
  )
  return {
    ok: true,
    datos: clonar(d, {
      slots,
      examenesSinFecha: d.examenesSinFecha.filter((x) => x.asesoradoId !== asesoradoId),
      notificaciones: avisos.length ? [...d.notificaciones, ...avisos] : d.notificaciones,
    }),
  }
}

export function liberarExamen(d: Datos, actor: Actor, slotId: string): Resultado<{ liberado: boolean }> {
  const slot = d.slots.find((x) => x.id === slotId)
  if (!slot || !slot.asesoradoId) return { ok: true, datos: d, extra: { liberado: false } }
  if (actor.rol !== 'admin' && slot.asignadoPor !== actor.id) {
    return { ok: false, error: 'Solo quien asignó el examen puede liberarlo.' }
  }
  return {
    ok: true,
    datos: clonar(d, {
      slots: d.slots.map((x) =>
        x.id === slotId ? { ...x, asesoradoId: undefined, asignadoPor: undefined, asignadoEn: undefined } : x,
      ),
    }),
    extra: { liberado: true },
  }
}

export function crearSala(d: Datos, actor: Actor, nombre: string): Resultado<{ sala: SalaExamen }> {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona las salas.' }
  const limpio = nombre.trim()
  if (!limpio) return { ok: false, error: 'Escribe el nombre de la sala.' }
  if (d.proceso.estado !== 'borrador') return { ok: false, error: 'El proceso ya está guardado; no se pueden crear salas.' }
  if (d.salas.some((x) => x.nombre.toLowerCase() === limpio.toLowerCase())) {
    return { ok: false, error: 'Ya existe una sala con ese nombre.' }
  }
  const sala: SalaExamen = { id: nuevoId(), numero: d.salas.length + 1, nombre: limpio }
  return { ok: true, datos: clonar(d, { salas: [...d.salas, sala] }), extra: { sala } }
}

export function renombrarSala(d: Datos, actor: Actor, salaId: string, nombre: string): Resultado {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona las salas.' }
  const limpio = nombre.trim()
  if (!limpio) return { ok: false, error: 'Escribe el nombre de la sala.' }
  if (d.proceso.estado !== 'borrador') return { ok: false, error: 'El proceso ya está guardado; no se pueden renombrar salas.' }
  if (d.salas.some((x) => x.id !== salaId && x.nombre.toLowerCase() === limpio.toLowerCase())) {
    return { ok: false, error: 'Ya existe una sala con ese nombre.' }
  }
  return { ok: true, datos: clonar(d, { salas: d.salas.map((x) => (x.id === salaId ? { ...x, nombre: limpio } : x)) }) }
}

export function eliminarSala(d: Datos, actor: Actor, salaId: string): Resultado<{ eliminado: boolean }> {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona las salas.' }
  if (d.proceso.estado !== 'borrador') return { ok: true, datos: d, extra: { eliminado: false } }
  if (d.slots.some((x) => x.salaId === salaId)) return { ok: true, datos: d, extra: { eliminado: false } }
  const salas = d.salas.filter((x) => x.id !== salaId)
  if (salas.length === d.salas.length) return { ok: true, datos: d, extra: { eliminado: false } }
  return {
    ok: true,
    datos: clonar(d, { salas: salas.map((x, i) => ({ ...x, numero: i + 1 })) }),
    extra: { eliminado: true },
  }
}

export function guardarProceso(d: Datos, actor: Actor, abreEn: string): Resultado {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona el proceso de inscripción.' }
  if (d.proceso.estado !== 'borrador' || d.salas.length === 0 || d.slots.length === 0) {
    return { ok: false, error: 'No hay un proceso en borrador con salas y horarios por guardar.' }
  }
  const iso = new Date(abreEn).toISOString()
  const mensaje = `Se guardó el proceso de inscripción de exámenes con ${d.salas.length} ${d.salas.length === 1 ? 'sala' : 'salas'}. La asignación abre el ${fechaCorta(iso)} a las ${horaLegible(iso)}.`
  const nuevas = d.users.filter((u) => u.rol === 'vocal').map((u) => notificacion(u.id, 'agenda_examen', mensaje))
  return { ok: true, datos: clonar(d, { proceso: { estado: 'guardado', abreEn: iso }, notificaciones: [...d.notificaciones, ...nuevas] }) }
}

export function abrirProceso(d: Datos, actor: Actor): Resultado {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona el proceso de inscripción.' }
  if (d.proceso.estado === 'borrador') return { ok: false, error: 'El proceso aún no se ha guardado.' }
  const nuevas = d.users
    .filter((u) => u.rol === 'vocal')
    .map((u) => notificacion(u.id, 'agenda_examen', 'El proceso de inscripción de exámenes está abierto; ya puedes asignar asesorados de tu carrera.'))
  return {
    ok: true,
    datos: clonar(d, { proceso: { estado: 'guardado', abreEn: null }, notificaciones: [...d.notificaciones, ...nuevas] }),
  }
}

export function cerrarProceso(d: Datos, actor: Actor): Resultado {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona el proceso de inscripción.' }
  if (d.proceso.estado === 'borrador') return { ok: false, error: 'El proceso aún no se ha guardado.' }
  const nuevas = d.users
    .filter((u) => u.rol === 'vocal')
    .map((u) => notificacion(u.id, 'agenda_examen', 'El proceso de inscripción de exámenes se cerró; no es posible asignar ni liberar por ahora.'))
  return {
    ok: true,
    datos: clonar(d, { proceso: { estado: 'cerrado', abreEn: null }, notificaciones: [...d.notificaciones, ...nuevas] }),
  }
}

export function borrarProceso(d: Datos, actor: Actor): Resultado {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador gestiona el proceso de inscripción.' }
  if (d.proceso.estado === 'borrador' && d.slots.length === 0 && d.salas.length === 0) {
    return { ok: false, error: 'No hay proceso por borrar.' }
  }
  const asignados = d.slots.filter((x) => x.asesoradoId)
  const sinFecha: ExamenSinFecha[] = asignados.map((x) => ({
    asesoradoId: x.asesoradoId as string,
    asignadoPor: x.asignadoPor as string,
    liberadoEn: new Date().toISOString(),
  }))
  let notificaciones = d.notificaciones
  for (const x of asignados) {
    const asesorado = d.asesorados.find((a) => a.id === x.asesoradoId)
    const sala = d.salas.find((y) => y.id === x.salaId)
    notificaciones = [
      ...notificaciones,
      notificacion(
        x.asignadoPor as string,
        'agenda_examen',
        `Se eliminó el proceso de inscripción: el examen de ${asesorado?.nombre ?? 'tu asesorado'} (${salaEtiqueta(sala)}) quedó sin fecha. Reasígnalo cuando se publique un nuevo proceso.`,
      ),
    ]
  }
  return {
    ok: true,
    datos: clonar(d, {
      slots: [],
      salas: [],
      proceso: { estado: 'borrador', abreEn: null },
      examenesSinFecha: [...d.examenesSinFecha, ...sinFecha],
      notificaciones,
    }),
  }
}

export function restablecerContrasena(d: Datos, actor: Actor, id: string): Resultado<{ usuario: User }> {
  if (actor.rol !== 'admin') return { ok: false, error: 'Solo el administrador puede restablecer contraseñas.' }
  const user = d.users.find((u) => u.id === id)
  if (!user || user.rol === 'admin') return { ok: false, error: 'No se puede restablecer esta cuenta.' }
  const nueva = generarContrasena()
  const usuarios = d.users.map((u) => (u.id === id ? { ...u, contrasena: nueva } : u))
  const notificaciones = [
    ...d.notificaciones,
    notificacion(
      id,
      'recuperacion',
      'Tu contraseña fue restablecida por el administrador: la anterior ya no es válida. Usa la nueva que te proporcionó; puedes cambiarla desde tu cuenta cuando quieras.',
    ),
  ]
  return {
    ok: true,
    datos: clonar(d, { users: usuarios, notificaciones }),
    extra: { usuario: { ...user, contrasena: nueva } },
  }
}

export function solicitarRecuperacion(d: Datos, usuario: string): Resultado {
  const cuenta = d.users.find((u) => u.rol !== 'admin' && u.correo.toLowerCase() === usuario.trim().toLowerCase())
  if (!cuenta) return { ok: false, error: 'No se encontró una cuenta con ese usuario.' }
  const admin = d.users.find((u) => u.rol === 'admin')
  if (!admin) return { ok: false, error: 'No hay administrador registrado.' }
  return {
    ok: true,
    datos: clonar(d, {
      notificaciones: [
        ...d.notificaciones,
        notificacion(admin.id, 'recuperacion', `${cuenta.nombre} (${cuenta.correo}) solicita restablecer su contraseña.`),
      ],
    }),
  }
}

export function cambiarContrasena(d: Datos, actor: Actor, nueva: string): Resultado {
  const user = d.users.find((u) => u.id === actor.id)
  if (!user) return { ok: false, error: 'No se encontró la cuenta.' }
  if (!nueva) return { ok: false, error: 'Escribe la nueva contraseña.' }
  return {
    ok: true,
    datos: clonar(d, { users: d.users.map((u) => (u.id === actor.id ? { ...u, contrasena: nueva } : u)) }),
  }
}

export function rutaPorRol(rol: Rol): string {
  return rol === 'admin' ? '/admin' : rol === 'vocal' ? '/vocal' : '/asesor'
}

export function carrerasRegistradas(s: Pick<Datos, 'users' | 'asesorados'>): string[] {
  return [
    ...new Set([
      ...s.users.filter((u) => u.rol === 'vocal' && u.carrera).map((u) => u.carrera as string),
      ...s.asesorados.map((a) => a.carrera),
    ]),
  ].sort((a, b) => a.localeCompare(b))
}

export function tieneBajaPendiente(solicitudes: Solicitud[], asesoradoId: string): boolean {
  return solicitudes.some((x) => x.asesoradoId === asesoradoId && x.estado === 'pendiente')
}

export function procesoAbierto(s: Pick<Datos, 'proceso'>): boolean {
  return s.proceso.estado === 'guardado' && (s.proceso.abreEn === null || Date.now() >= new Date(s.proceso.abreEn).getTime())
}

export function salaEtiqueta(sala?: SalaExamen): string {
  return sala ? `Sala ${sala.numero} · ${sala.nombre}` : 'sin sala'
}
