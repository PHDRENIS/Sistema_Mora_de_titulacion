import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { eliminarArchivo, guardarArchivo } from '@/lib/idb'
import { fechaCorta, horaLegible } from '@/lib/format'

export type Rol = 'admin' | 'vocal' | 'asesor'

export interface User {
  id: string
  rol: Rol
  nombre: string
  correo: string
  contrasena: string
  carrera?: string
  creadoEn: string
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

export type TipoNotificacion = 'asignacion' | 'solicitud_baja' | 'solicitud_resuelta' | 'revision_revisada' | 'examen_asignado' | 'agenda_examen'

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

const uid = () => `x${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

const diasAtras = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

export function generarContrasena(): string {
  const minus = 'abcdefghjkmnpqrstuvwxyz'
  const mayus = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  const digitos = '23456789'
  const tomar = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join('')
  return [tomar(minus, 4), tomar(mayus, 1), tomar(digitos, 2), tomar(minus, 1)]
    .sort(() => Math.random() - 0.5)
    .join('')
}

export function listaNombres(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('')
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`
}

function notificacion(para: string, tipo: TipoNotificacion, mensaje: string, leida = false, creadoEn = new Date().toISOString()): Notificacion {
  return { id: uid(), para, tipo, mensaje, leida, creadoEn }
}

interface DatosCuenta {
  nombre: string
  correo: string
}

interface DatosAsesorado {
  nombre: string
  matricula: string
  correo: string
  carrera: string
}

export interface CambioAsignacion {
  asesoradoId: string
  asignaciones: AsignacionAsesor[]
}

interface DB {
  users: User[]
  asesorados: Asesorado[]
  revisiones: Revision[]
  solicitudes: Solicitud[]
  notificaciones: Notificacion[]
  slots: SlotExamen[]
  salas: SalaExamen[]
  proceso: ProcesoExamen
  examenesSinFecha: ExamenSinFecha[]
  sesionId: string | null

  iniciarSesion: (correo: string, contrasena: string) => boolean
  cerrarSesion: () => void
  crearVocal: (datos: DatosCuenta & { carrera: string }) => User
  borrarVocal: (id: string) => void
  crearAsesor: (datos: DatosCuenta) => User
  crearAsesorado: (datos: DatosAsesorado) => void
  guardarAsignacion: (cambios: CambioAsignacion[]) => void
  solicitarBaja: (asesoradoId: string, solicitadoPor: string) => void
  resolverSolicitud: (solicitudId: string, aceptar: boolean, resueltoPor: string) => void
  agregarRevision: (asesoradoId: string, descripcion: string, archivo: File) => Promise<void>
  revisarRevision: (revisionId: string, estado: EstadoFinal, nota: string, revisorId: string) => void
  marcarLeidas: (usuarioId: string) => void
  marcarLeida: (notificacionId: string) => void
  generarSlots: (fechaInicio: string, fechaFin: string) => number
  eliminarSlot: (slotId: string) => boolean
  asignarExamen: (slotId: string, asesoradoId: string, vocalId: string) => { ok: boolean; error?: string }
  liberarExamen: (slotId: string, usuarioId: string) => boolean
  crearSala: (nombre: string) => void
  renombrarSala: (salaId: string, nombre: string) => void
  eliminarSala: (salaId: string) => boolean
  guardarProceso: (abreEn: string) => void
  abrirProceso: () => void
  cerrarProceso: () => void
  borrarProceso: () => void
}

const CARRERAS = [
  'Ingeniería en Sistemas Computacionales',
  'Ingeniería Industrial',
  'Ingeniería Civil',
  'Ingeniería Mecatrónica',
  'Ingeniería Electrónica',
  'Ingeniería Química',
  'Ingeniería Ambiental',
  'Licenciatura en Administración',
  'Licenciatura en Contaduría',
  'Licenciatura en Gestión Empresarial',
]

const VOCALES = [
  { nombre: 'Martha Villalobos Duarte', correo: 'martha.villalobos@escuela.mx' },
  { nombre: 'Raúl Contreras Fuentes', correo: 'raul.contreras@escuela.mx' },
  { nombre: 'Guadalupe Herrera Solís', correo: 'guadalupe.herrera@escuela.mx' },
  { nombre: 'Ernesto Cázares Limón', correo: 'ernesto.cazares@escuela.mx' },
  { nombre: 'Silvia Peña Navarro', correo: 'silvia.pena@escuela.mx' },
  { nombre: 'Héctor Aguilar Zavala', correo: 'hector.aguilar@escuela.mx' },
  { nombre: 'Rocío Béjar Lugo', correo: 'rocio.bejar@escuela.mx' },
  { nombre: 'Gustavo Quintana Ríos', correo: 'gustavo.quintana@escuela.mx' },
  { nombre: 'Alicia Márquez Polo', correo: 'alicia.marquez@escuela.mx' },
  { nombre: 'Sergio Delgado Bustos', correo: 'sergio.delgado@escuela.mx' },
]

const ASESORES = [
  { nombre: 'Elena Ramírez Soto', correo: 'elena.ramirez@escuela.mx' },
  { nombre: 'Jorge Salazar Medina', correo: 'jorge.salazar@escuela.mx' },
  { nombre: 'Laura Espinoza Vega', correo: 'laura.espinoza@escuela.mx' },
  { nombre: 'Andrés Castillo Bravo', correo: 'andres.castillo@escuela.mx' },
  { nombre: 'Patricia Lozano Rey', correo: 'patricia.lozano@escuela.mx' },
  { nombre: 'Miguel Ángel Torres Cano', correo: 'miguel.cano@escuela.mx' },
  { nombre: 'Gabriela Anaya Rueda', correo: 'gabriela.anaya@escuela.mx' },
  { nombre: 'Rubén Olguín Peralta', correo: 'ruben.olguin@escuela.mx' },
  { nombre: 'Carmen Ibarra Ledesma', correo: 'carmen.ibarra@escuela.mx' },
  { nombre: 'Fernando Zárate Montes', correo: 'fernando.zarate@escuela.mx' },
  { nombre: 'Norma Elizondo Arriaga', correo: 'norma.elizondo@escuela.mx' },
  { nombre: 'Tomás Barragán Civico', correo: 'tomas.barragan@escuela.mx' },
  { nombre: 'Verónica Pineda Alcázar', correo: 'veronica.pineda@escuela.mx' },
  { nombre: 'Ricardo Mendoza Lara', correo: 'ricardo.mendoza@escuela.mx' },
  { nombre: 'Diana Escalante Prieto', correo: 'diana.escalante@escuela.mx' },
  { nombre: 'Óscar Beltrán Cuéllar', correo: 'oscar.beltran@escuela.mx' },
  { nombre: 'Lucía Fonseca Trillo', correo: 'lucia.fonseca@escuela.mx' },
  { nombre: 'Pablo Heredia Sáenz', correo: 'pablo.heredia@escuela.mx' },
  { nombre: 'Adriana Rocha Villaseñor', correo: 'adriana.rocha@escuela.mx' },
  { nombre: 'Emilio Cordero Gaxiola', correo: 'emilio.cordero@escuela.mx' },
  { nombre: 'Sandra Tovar Benavides', correo: 'sandra.tovar@escuela.mx' },
  { nombre: 'Julián Peralta Ochoa', correo: 'julian.peralta@escuela.mx' },
  { nombre: 'Mónica Rentería Salas', correo: 'monica.renteria@escuela.mx' },
  { nombre: 'Arturo Zambrano Leal', correo: 'arturo.zambrano@escuela.mx' },
  { nombre: 'Claudia Verdugo Alamillo', correo: 'claudia.verdugo@escuela.mx' },
]

const NOMBRES_ASESORADOS = [
  'Ana García Torres',
  'Luis Mendoza Ruiz',
  'Sofía Cortés Pineda',
  'Diego Herrera Luna',
  'Valeria Núñez Cruz',
  'Oscar Fuentes Vega',
  'Paola Guzmán Reyes',
  'Marco Antonio Silva',
  'Carla Domínguez Ríos',
  'Iván Robles Acosta',
  'Fernanda Ortiz Campos',
  'Emiliano Vargas Salinas',
  'Renata Aguilar Bello',
  'Cristian Nava Espinosa',
  'Julia Cardona Miranda',
  'Rodrigo Alcántara Vives',
  'Bianca Treviño Manzur',
  'Saúl Ibáñez Quesada',
  'Wendy Chávez Arriola',
  'Mauricio Cisneros Lugo',
  'Daniela Ocampo Ferrer',
  'Arturo Galván Preciado',
  'Ximena Rueda Monjaraz',
  'Bruno Estrada Villalpando',
  'Natalia Quintero Arvizu',
]

const slug = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const correoPersonal = (nombre: string, dominio: string) => {
  const [primero, ...resto] = slug(nombre).split(' ')
  const ultimo = resto[resto.length - 1]
  return `${primero}.${ultimo}@${dominio}`
}

function construirDatosIniciales() {
  const users: User[] = [
    { id: 'admin', rol: 'admin', nombre: 'Coordinación de Titulación', correo: 'admin@escuela.mx', contrasena: 'admin123', creadoEn: diasAtras(120) },
    ...VOCALES.map((v, i): User => ({
      id: `v${i + 1}`,
      rol: 'vocal',
      nombre: v.nombre,
      correo: v.correo,
      contrasena: 'vocal123',
      carrera: CARRERAS[i],
      creadoEn: diasAtras(115 - i * 2),
    })),
    ...ASESORES.map((a, i): User => ({
      id: `a${i + 1}`,
      rol: 'asesor',
      nombre: a.nombre,
      correo: a.correo,
      contrasena: 'asesor123',
      creadoEn: diasAtras(110 - i * 2),
    })),
  ]

  const asesorados: Asesorado[] = NOMBRES_ASESORADOS.map((nombre, i) => ({
    id: `as${i + 1}`,
    asignaciones: [],
    nombre,
    correo: correoPersonal(nombre, 'alumno.mx'),
    matricula: `2019${String(630400 + i * 7).slice(4)}`,
    carrera: CARRERAS[i % CARRERAS.length],
    creadoEn: diasAtras(80 - i * 2),
  }))

  return {
    users,
    asesorados,
    revisiones: [] as Revision[],
    solicitudes: [] as Solicitud[],
    notificaciones: [] as Notificacion[],
    slots: [] as SlotExamen[],
    salas: [] as SalaExamen[],
    proceso: { estado: 'borrador', abreEn: null } as ProcesoExamen,
    examenesSinFecha: [] as ExamenSinFecha[],
    sesionId: null as string | null,
  }
}

export const useDB = create<DB>()(
  persist(
    (set) => ({
      ...construirDatosIniciales(),

      iniciarSesion: (correo, contrasena) => {
        const user = useDB.getState().users.find(
          (u) => u.correo.toLowerCase() === correo.trim().toLowerCase() && u.contrasena === contrasena,
        )
        if (!user) return false
        set({ sesionId: user.id })
        return true
      },

      cerrarSesion: () => set({ sesionId: null }),

      crearVocal: ({ nombre, correo, carrera }) => {
        const user: User = {
          id: uid(),
          rol: 'vocal',
          nombre: nombre.trim(),
          correo: correo.trim().toLowerCase(),
          contrasena: generarContrasena(),
          carrera: carrera.trim(),
          creadoEn: new Date().toISOString(),
        }
        set((s) => ({ users: [...s.users, user] }))
        return user
      },

      borrarVocal: (id) => {
        set((s) => ({ users: s.users.filter((u) => u.id !== id || u.rol !== 'vocal') }))
      },

      crearAsesor: ({ nombre, correo }) => {
        const user: User = {
          id: uid(),
          rol: 'asesor',
          nombre: nombre.trim(),
          correo: correo.trim().toLowerCase(),
          contrasena: generarContrasena(),
          creadoEn: new Date().toISOString(),
        }
        set((s) => ({ users: [...s.users, user] }))
        return user
      },

      crearAsesorado: ({ nombre, matricula, correo, carrera }) => {
        const asesorado: Asesorado = {
          id: uid(),
          asignaciones: [],
          nombre: nombre.trim(),
          matricula: matricula.trim(),
          correo: correo.trim().toLowerCase(),
          carrera: carrera.trim(),
          creadoEn: new Date().toISOString(),
        }
        set((s) => ({ asesorados: [...s.asesorados, asesorado] }))
      },

      guardarAsignacion: (cambios) => {
        set((s) => {
          let asesorados = s.asesorados
          let notificaciones = s.notificaciones
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
          return { asesorados, notificaciones }
        })
      },

      solicitarBaja: (asesoradoId, solicitadoPor) => {
        set((s) => {
          const asesorado = s.asesorados.find((a) => a.id === asesoradoId)
          if (!asesorado) return {}
          const solicitud: Solicitud = {
            id: uid(),
            asesoradoId,
            solicitadoPor,
            estado: 'pendiente',
            creadoEn: new Date().toISOString(),
          }
          const admin = s.users.find((u) => u.rol === 'admin')
          const solicitante = s.users.find((u) => u.id === solicitadoPor)
          const notifs = admin
            ? [...s.notificaciones, notificacion(admin.id, 'solicitud_baja', `${solicitante?.nombre ?? 'Un asesor'} solicita la baja de ${asesorado.nombre}.`)]
            : s.notificaciones
          return { solicitudes: [...s.solicitudes, solicitud], notificaciones: notifs }
        })
      },

      resolverSolicitud: (solicitudId, aceptar, resueltoPor) => {
        set((s) => {
          const sol = s.solicitudes.find((x) => x.id === solicitudId)
          if (!sol || sol.estado !== 'pendiente') return {}
          const asesorado = s.asesorados.find((a) => a.id === sol.asesoradoId)
          if (!asesorado) return {}
          const ahora = new Date().toISOString()
          const resuelta: Solicitud = { ...sol, estado: aceptar ? 'aceptada' : 'rechazada', resueltoPor, resueltoEn: ahora }
          const solicitudes = s.solicitudes.map((x) => (x.id === sol.id ? resuelta : x))
          let asesorados = s.asesorados
          let revisiones = s.revisiones
          if (aceptar) {
            const claves = s.revisiones.filter((r) => r.asesoradoId === asesorado.id).map((r) => r.archivo.clave)
            asesorados = s.asesorados.filter((a) => a.id !== asesorado.id)
            revisiones = s.revisiones.filter((r) => r.asesoradoId !== asesorado.id)
            for (const clave of claves) void eliminarArchivo(clave).catch(() => undefined)
          }
          const revisor = s.users.find((u) => u.id === resueltoPor)
          const mensaje = aceptar
            ? `Tu baja de ${asesorado.nombre} fue aceptada por ${revisor?.nombre ?? 'Coordinación'}; el asesorado se eliminó junto con sus revisiones.`
            : `Tu baja de ${asesorado.nombre} fue rechazada por ${revisor?.nombre ?? 'Coordinación'}; el asesorado sigue activo.`
          const notificaciones = [...s.notificaciones, notificacion(sol.solicitadoPor, 'solicitud_resuelta', mensaje)]
          return { solicitudes, asesorados, revisiones, notificaciones }
        })
      },

      agregarRevision: async (asesoradoId, descripcion, archivo) => {
        const clave = await guardarArchivo(archivo)
        set((s) => {
          const previas = s.revisiones.filter((r) => r.asesoradoId === asesoradoId)
          const revision: Revision = {
            id: uid(),
            asesoradoId,
            numero: previas.reduce((max, r) => Math.max(max, r.numero), 0) + 1,
            fecha: new Date().toISOString(),
            descripcion: descripcion.trim(),
            archivo: { nombre: archivo.name, tipo: archivo.type, tamano: archivo.size, clave },
            estado: 'pendiente',
          }
          return { revisiones: [...s.revisiones, revision] }
        })
      },

      revisarRevision: (revisionId, estado, nota, revisorId) => {
        set((s) => {
          const rev = s.revisiones.find((r) => r.id === revisionId)
          if (!rev) return {}
          const asesorado = s.asesorados.find((a) => a.id === rev.asesoradoId)
          const revisor = s.users.find((u) => u.id === revisorId)
          const revisiones = s.revisiones.map((r) =>
            r.id === revisionId ? { ...r, estado, nota: nota.trim() || undefined, revisadoEn: new Date().toISOString() } : r,
          )
          const etiqueta: Record<EstadoFinal, string> = {
            aceptada: 'aceptada',
            con_observaciones: 'marcada con observaciones',
            rechazada: 'rechazada',
          }
          const mensaje = `Tu revisión ${rev.numero} de ${asesorado?.nombre ?? ''} quedó ${etiqueta[estado]} por ${revisor?.nombre ?? 'Coordinación'}.${nota.trim() ? ` Nota: "${nota.trim()}"` : ''}`
          const avisos = (asesorado?.asignaciones ?? []).map((x) => notificacion(x.asesorId, 'revision_revisada', mensaje))
          return { revisiones, notificaciones: avisos.length ? [...s.notificaciones, ...avisos] : s.notificaciones }
        })
      },

      generarSlots: (fechaInicio, fechaFin) => {
        const s0 = useDB.getState()
        if (s0.proceso.estado !== 'borrador') return 0
        if (s0.salas.length === 0) return 0
        const [y1, m1, d1] = fechaInicio.split('-').map(Number)
        const [y2, m2, d2] = fechaFin.split('-').map(Number)
        const diaInicio = new Date(y1, m1 - 1, d1)
        const diaFin = new Date(y2, m2 - 1, d2)
        const fechas: { fecha: string; horas: string[] }[] = []
        for (let d = diaInicio; d <= diaFin; d.setDate(d.getDate() + 1)) {
          const horas = turnosDeDia(d.getDay()).flatMap((t) => t.horas)
          if (horas.length === 0) continue
          fechas.push({
            fecha: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
            horas,
          })
        }
        let creados = 0
        set((s) => {
          const existentes = new Set(s.slots.map((x) => `${x.fecha} ${x.horaInicio} ${x.salaId}`))
          const nuevos = s.salas
            .flatMap((sala) =>
              fechas
                .flatMap((f) =>
                  f.horas
                    .filter((h) => !existentes.has(`${f.fecha} ${h} ${sala.id}`))
                    .map((h): SlotExamen => ({ id: uid(), fecha: f.fecha, horaInicio: h, duracionMin: DURACION_EXAMEN, salaId: sala.id })),
                ),
            )
          creados = nuevos.length
          return { slots: [...s.slots, ...nuevos] }
        })
        return creados
      },

      eliminarSlot: (slotId) => {
        let eliminado = false
        set((s) => {
          const slot = s.slots.find((x) => x.id === slotId)
          if (!slot || slot.asesoradoId || s.proceso.estado !== 'borrador') return {}
          eliminado = true
          return { slots: s.slots.filter((x) => x.id !== slotId) }
        })
        return eliminado
      },

      asignarExamen: (slotId, asesoradoId, usuarioId) => {
        const s = useDB.getState()
        const slot = s.slots.find((x) => x.id === slotId)
        const asesorado = s.asesorados.find((a) => a.id === asesoradoId)
        const usuario = s.users.find((u) => u.id === usuarioId)
        if (!slot || !asesorado || !usuario) return { ok: false, error: 'No se encontró el horario o el asesorado.' }
        if (!procesoAbierto(s)) return { ok: false, error: 'El proceso no está abierto para asignaciones.' }
        if (slot.asesoradoId) return { ok: false, error: 'Ese horario acaba de ser ocupado. Elige otro.' }
        if (usuario.rol !== 'admin' && asesorado.carrera !== usuario.carrera) {
          return { ok: false, error: 'El asesorado no pertenece a tu carrera.' }
        }
        if (s.slots.some((x) => x.asesoradoId === asesoradoId)) {
          return { ok: false, error: 'Ese asesorado ya tiene un examen asignado.' }
        }
        const puestosCandidato = new Map(asesorado.asignaciones.map((x) => [x.asesorId, x.puesto]))
        const conflictos: { asesorId: string; nombreAsesor: string; puesto: PuestoSinodal; otro: string }[] = []
        if (puestosCandidato.size > 0) {
          for (const x of s.slots) {
            if (!x.asesoradoId || x.asesoradoId === asesoradoId) continue
            if (x.fecha !== slot.fecha || x.horaInicio !== slot.horaInicio) continue
            const otro = s.asesorados.find((a) => a.id === x.asesoradoId)
            if (!otro) continue
            for (const sinodal of otro.asignaciones) {
              if (conflictos.some((c) => c.asesorId === sinodal.asesorId)) continue
              if (!puestosCandidato.has(sinodal.asesorId)) continue
              conflictos.push({
                asesorId: sinodal.asesorId,
                nombreAsesor: s.users.find((u) => u.id === sinodal.asesorId)?.nombre ?? sinodal.asesorId,
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
        const sala = s.salas.find((x) => x.id === slot.salaId)
        const mensaje = `${asesorado.nombre} tiene examen profesional el ${fechaCorta(slot.fecha)} a las ${slot.horaInicio} en ${salaEtiqueta(sala)}.`
        const avisos = asesorado.asignaciones.map((x) => notificacion(x.asesorId, 'examen_asignado', mensaje))
        set((st) => ({
          slots: st.slots.map((x) =>
            x.id === slotId && !x.asesoradoId ? { ...x, asesoradoId, asignadoPor: usuarioId, asignadoEn: ahora } : x,
          ),
          examenesSinFecha: st.examenesSinFecha.filter((x) => x.asesoradoId !== asesoradoId),
          notificaciones: avisos.length ? [...st.notificaciones, ...avisos] : st.notificaciones,
        }))
        return { ok: true }
      },

      liberarExamen: (slotId, usuarioId) => {
        const s = useDB.getState()
        const slot = s.slots.find((x) => x.id === slotId)
        const usuario = s.users.find((u) => u.id === usuarioId)
        if (!slot || !slot.asesoradoId || !usuario) return false
        if (usuario.rol !== 'admin' && slot.asignadoPor !== usuarioId) return false
        set((st) => ({
          slots: st.slots.map((x) =>
            x.id === slotId ? { ...x, asesoradoId: undefined, asignadoPor: undefined, asignadoEn: undefined } : x,
          ),
        }))
        return true
      },

      crearSala: (nombre) => {
        const limpio = nombre.trim()
        if (!limpio) return
        set((s) => {
          if (s.proceso.estado !== 'borrador') return {}
          const duplicado = s.salas.some((x) => x.nombre.toLowerCase() === limpio.toLowerCase())
          if (duplicado) return {}
          return { salas: [...s.salas, { id: uid(), numero: s.salas.length + 1, nombre: limpio }] }
        })
      },

      renombrarSala: (salaId, nombre) => {
        const limpio = nombre.trim()
        if (!limpio) return
        set((s) => {
          if (s.proceso.estado !== 'borrador') return {}
          const duplicado = s.salas.some((x) => x.id !== salaId && x.nombre.toLowerCase() === limpio.toLowerCase())
          if (duplicado) return {}
          return { salas: s.salas.map((x) => (x.id === salaId ? { ...x, nombre: limpio } : x)) }
        })
      },

      eliminarSala: (salaId) => {
        let eliminado = false
        set((s) => {
          if (s.proceso.estado !== 'borrador') return {}
          if (s.slots.some((x) => x.salaId === salaId)) return {}
          const salas = s.salas.filter((x) => x.id !== salaId)
          if (salas.length === s.salas.length) return {}
          eliminado = true
          return { salas: salas.map((x, i) => ({ ...x, numero: i + 1 })) }
        })
        return eliminado
      },

      guardarProceso: (abreEn) => {
        set((s) => {
          if (s.proceso.estado !== 'borrador' || s.salas.length === 0 || s.slots.length === 0) return {}
          const iso = new Date(abreEn).toISOString()
          const mensaje = `Se guardó el proceso de inscripción de exámenes con ${s.salas.length} ${s.salas.length === 1 ? 'sala' : 'salas'}. La asignación abre el ${fechaCorta(iso)} a las ${horaLegible(iso)}.`
          const nuevas = s.users.filter((u) => u.rol === 'vocal').map((u) => notificacion(u.id, 'agenda_examen', mensaje))
          return { proceso: { estado: 'guardado', abreEn: iso }, notificaciones: [...s.notificaciones, ...nuevas] }
        })
      },

      abrirProceso: () => {
        set((s) => {
          if (s.proceso.estado === 'borrador') return {}
          const nuevas = s.users
            .filter((u) => u.rol === 'vocal')
            .map((u) => notificacion(u.id, 'agenda_examen', 'El proceso de inscripción de exámenes está abierto; ya puedes asignar asesorados de tu carrera.'))
          return { proceso: { estado: 'guardado', abreEn: null }, notificaciones: [...s.notificaciones, ...nuevas] }
        })
      },

      cerrarProceso: () => {
        set((s) => {
          if (s.proceso.estado === 'borrador') return {}
          const nuevas = s.users
            .filter((u) => u.rol === 'vocal')
            .map((u) => notificacion(u.id, 'agenda_examen', 'El proceso de inscripción de exámenes se cerró; no es posible asignar ni liberar por ahora.'))
          return { proceso: { estado: 'cerrado', abreEn: null }, notificaciones: [...s.notificaciones, ...nuevas] }
        })
      },

      borrarProceso: () => {
        set((s) => {
          if (s.proceso.estado === 'borrador' && s.slots.length === 0 && s.salas.length === 0) return {}
          const asignados = s.slots.filter((x) => x.asesoradoId)
          const sinFecha: ExamenSinFecha[] = asignados.map((x) => ({ asesoradoId: x.asesoradoId as string, asignadoPor: x.asignadoPor as string, liberadoEn: new Date().toISOString() }))
          let notificaciones = s.notificaciones
          for (const x of asignados) {
            const asesorado = s.asesorados.find((a) => a.id === x.asesoradoId)
            const sala = s.salas.find((y) => y.id === x.salaId)
            notificaciones = [
              ...notificaciones,
              notificacion(
                x.asignadoPor as string,
                'agenda_examen',
                `Se eliminó el proceso de inscripción: el examen de ${asesorado?.nombre ?? 'tu asesorado'} (${salaEtiqueta(sala)}) quedó sin fecha. Reasígnalo cuando se publique un nuevo proceso.`,
              ),
            ]
          }
          return { slots: [], salas: [], proceso: { estado: 'borrador', abreEn: null }, examenesSinFecha: [...s.examenesSinFecha, ...sinFecha], notificaciones }
        })
      },

      marcarLeidas: (usuarioId) => {
        set((s) => ({ notificaciones: s.notificaciones.map((n) => (n.para === usuarioId ? { ...n, leida: true } : n)) }))
      },

      marcarLeida: (notificacionId) => {
        set((s) => ({ notificaciones: s.notificaciones.map((n) => (n.id === notificacionId ? { ...n, leida: true } : n)) }))
      },
    }),
    {
      name: 'titulacion-db-v2',
      version: 3,
      migrate: () => {
        const fresco = construirDatosIniciales()
        return { ...fresco, sesionId: null } as unknown as DB
      },
    },
  ),
)

export function useUsuarioActual(): User | null {
  return useDB((s) => s.users.find((u) => u.id === s.sesionId) ?? null)
}

export function restablecerDatos() {
  useDB.persist.clearStorage()
  window.location.reload()
}

export function rutaPorRol(rol: Rol): string {
  return rol === 'admin' ? '/admin' : rol === 'vocal' ? '/vocal' : '/asesor'
}

export function carrerasRegistradas(s: Pick<DB, 'users' | 'asesorados'>): string[] {
  return [...new Set([...s.users.filter((u) => u.rol === 'vocal' && u.carrera).map((u) => u.carrera as string), ...s.asesorados.map((a) => a.carrera)])].sort((a, b) => a.localeCompare(b))
}

export function tieneBajaPendiente(solicitudes: Solicitud[], asesoradoId: string): boolean {
  return solicitudes.some((x) => x.asesoradoId === asesoradoId && x.estado === 'pendiente')
}

export function procesoAbierto(s: Pick<DB, 'proceso'>): boolean {
  return s.proceso.estado === 'guardado' && (s.proceso.abreEn === null || Date.now() >= new Date(s.proceso.abreEn).getTime())
}

export function salaEtiqueta(sala?: SalaExamen): string {
  return sala ? `Sala ${sala.numero} · ${sala.nombre}` : 'sin sala'
}
