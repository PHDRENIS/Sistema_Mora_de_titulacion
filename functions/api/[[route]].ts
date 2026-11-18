/// <reference types="@cloudflare/workers-types" />
import {
  type Actor,
  type ArchivoMeta,
  type CambioAsignacion,
  type Datos,
  type DatosAsesorado,
  type DatosCuenta,
  type EstadoFinal,
  type User,
  asignarExamen,
  abrirProceso,
  agregarRevision,
  borrarProceso,
  borrarVocal,
  cambiarContrasena,
  cerrarProceso,
  crearAsesor,
  crearAsesorado,
  crearSala,
  crearVocal,
  eliminarSala,
  eliminarSlot,
  estadoInicial,
  generarSlots,
  guardarAsignacion,
  guardarProceso,
  hashContrasena,
  liberarExamen,
  marcarLeida,
  marcarLeidas,
  nuevoId,
  renombrarSala,
  restablecerContrasena,
  resolverSolicitud,
  revisarRevision,
  solicitarBaja,
  solicitarRecuperacion,
  verificarContrasena,
} from '../../src/lib/dominio'

interface Env {
  DB: D1Database
  ARCHIVOS: R2Bucket
  ADMIN_CONTRASENA?: string
}

const COOKIE = 'sesion'
const VIGENCIA_SESION_MS = 7 * 86400000
const MAX_ARCHIVO = 10 * 1024 * 1024

type ResultadoBasico = { ok: true; datos: Datos; extra?: unknown } | { ok: false; error: string }
type Reductor = (datos: Datos, actor: Actor, parametros: Record<string, unknown>) => ResultadoBasico

const REDUCTORES: Record<string, Reductor> = {
  crearVocal: (d, a, p) => crearVocal(d, a, p.entrada as DatosCuenta & { carrera: string }),
  borrarVocal: (d, a, p) => borrarVocal(d, a, p.id as string),
  crearAsesor: (d, a, p) => crearAsesor(d, a, p.entrada as DatosCuenta),
  crearAsesorado: (d, a, p) => crearAsesorado(d, a, p.entrada as DatosAsesorado),
  guardarAsignacion: (d, a, p) => guardarAsignacion(d, a, p.cambios as CambioAsignacion[]),
  solicitarBaja: (d, a, p) => solicitarBaja(d, a, p.asesoradoId as string),
  resolverSolicitud: (d, a, p) => resolverSolicitud(d, a, p.solicitudId as string, p.aceptar as boolean),
  agregarRevision: (d, a, p) =>
    agregarRevision(d, a, {
      asesoradoId: p.asesoradoId as string,
      descripcion: p.descripcion as string,
      archivo: p.archivo as ArchivoMeta,
    }),
  revisarRevision: (d, a, p) => revisarRevision(d, a, p.revisionId as string, p.estado as EstadoFinal, p.nota as string),
  marcarLeidas: (d, a) => marcarLeidas(d, a),
  marcarLeida: (d, a, p) => marcarLeida(d, a, p.notificacionId as string),
  generarSlots: (d, a, p) => generarSlots(d, a, p.fechaInicio as string, p.fechaFin as string),
  eliminarSlot: (d, a, p) => eliminarSlot(d, a, p.slotId as string),
  asignarExamen: (d, a, p) => asignarExamen(d, a, p.slotId as string, p.asesoradoId as string),
  liberarExamen: (d, a, p) => liberarExamen(d, a, p.slotId as string),
  crearSala: (d, a, p) => crearSala(d, a, p.nombre as string),
  renombrarSala: (d, a, p) => renombrarSala(d, a, p.salaId as string, p.nombre as string),
  eliminarSala: (d, a, p) => eliminarSala(d, a, p.salaId as string),
  guardarProceso: (d, a, p) => guardarProceso(d, a, p.abreEn as string),
  abrirProceso: (d, a) => abrirProceso(d, a),
  cerrarProceso: (d, a) => cerrarProceso(d, a),
  borrarProceso: (d, a) => borrarProceso(d, a),
  restablecerContrasena: (d, a, p) => restablecerContrasena(d, a, p.id as string),
  cambiarContrasena: (d, a, p) => cambiarContrasena(d, a, p.nueva as string),
}

const soloAdmin = (a: Actor) => a.rol === 'admin'
const adminOVocal = (a: Actor) => a.rol === 'admin' || a.rol === 'vocal'
const cualquiera = () => true

const PERMISOS: Record<string, (actor: Actor) => boolean> = {
  crearVocal: soloAdmin,
  borrarVocal: soloAdmin,
  crearAsesor: adminOVocal,
  crearAsesorado: adminOVocal,
  guardarAsignacion: adminOVocal,
  solicitarBaja: cualquiera,
  resolverSolicitud: soloAdmin,
  agregarRevision: cualquiera,
  revisarRevision: adminOVocal,
  marcarLeidas: cualquiera,
  marcarLeida: cualquiera,
  generarSlots: soloAdmin,
  eliminarSlot: soloAdmin,
  asignarExamen: adminOVocal,
  liberarExamen: cualquiera,
  crearSala: soloAdmin,
  renombrarSala: soloAdmin,
  eliminarSala: soloAdmin,
  guardarProceso: soloAdmin,
  abrirProceso: soloAdmin,
  cerrarProceso: soloAdmin,
  borrarProceso: soloAdmin,
  restablecerContrasena: soloAdmin,
  cambiarContrasena: cualquiera,
}

function json(cuerpo: unknown, estado = 200, cabeceras: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      ...cabeceras,
    },
  })
}

function valorCookie(request: Request, nombre: string): string | null {
  const cabecera = request.headers.get('Cookie') ?? ''
  for (const parte of cabecera.split(';')) {
    const [clave, ...valores] = parte.trim().split('=')
    if (clave === nombre) return valores.join('=')
  }
  return null
}

function esHttps(request: Request): boolean {
  return new URL(request.url).protocol === 'https:'
}

function cookieSesion(token: string, segura: boolean, maxAgeSegundos: number): string {
  return `${COOKIE}=${token}; Path=/; Max-Age=${maxAgeSegundos}; SameSite=Lax; HttpOnly${segura ? '; Secure' : ''}`
}

function cookieSesionBorrada(segura: boolean): string {
  return `${COOKIE}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly${segura ? '; Secure' : ''}`
}

function tokenSesion(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function publico(user: User): User {
  const copia = { ...user }
  delete copia.hash
  delete copia.contrasena
  return copia
}

function publicoDatos(datos: Datos): Datos {
  return { ...datos, users: datos.users.map(publico) }
}

async function crearTablas(env: Env): Promise<void> {
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS estado (id INTEGER PRIMARY KEY CHECK (id = 1), datos TEXT NOT NULL, version INTEGER NOT NULL)').run()
  await env.DB.prepare('CREATE TABLE IF NOT EXISTS sesiones (token TEXT PRIMARY KEY, usuario_id TEXT NOT NULL, expira_en TEXT NOT NULL)').run()
  await env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON sesiones (expira_en)').run()
}

async function cargarEstado(env: Env): Promise<{ datos: Datos; version: number }> {
  let fila = await env.DB.prepare('SELECT datos, version FROM estado WHERE id = 1')
    .first<{ datos: string; version: number }>()
    .catch(() => null)
  if (!fila) {
    await crearTablas(env)
    fila = await env.DB.prepare('SELECT datos, version FROM estado WHERE id = 1').first<{ datos: string; version: number }>()
  }
  if (fila) {
    return { datos: JSON.parse(fila.datos) as Datos, version: fila.version }
  }
  const admin: User = {
    id: 'admin',
    rol: 'admin',
    nombre: 'René Alejandro Santos Mora',
    correo: 'admin',
    hash: await hashContrasena(env.ADMIN_CONTRASENA ?? 'ReneAlejandroSantosMora'),
    creadoEn: new Date().toISOString(),
  }
  const datos = estadoInicial(admin)
  try {
    await env.DB.prepare('INSERT INTO estado (id, datos, version) VALUES (1, ?, 1)').bind(JSON.stringify(datos)).run()
  } catch {
    // Otra solicitud la creó en paralelo; se relee más adelante.
  }
  return { datos, version: 1 }
}

async function guardarEstado(env: Env, datos: Datos, version: number): Promise<boolean> {
  const res = await env.DB.prepare('UPDATE estado SET datos = ?, version = ? WHERE id = 1 AND version = ?')
    .bind(JSON.stringify(datos), version + 1, version)
    .run()
  return (res.meta.changes ?? 0) > 0
}

async function usuarioDeSesion(request: Request, env: Env): Promise<User | null> {
  const token = valorCookie(request, COOKIE)
  if (!token) return null
  const fila = await env.DB.prepare('SELECT usuario_id, expira_en FROM sesiones WHERE token = ?')
    .bind(token)
    .first<{ usuario_id: string; expira_en: string }>()
  if (!fila) return null
  if (new Date(fila.expira_en).getTime() < Date.now()) {
    await env.DB.prepare('DELETE FROM sesiones WHERE token = ?').bind(token).run()
    return null
  }
  const { datos } = await cargarEstado(env)
  return datos.users.find((u) => u.id === fila.usuario_id) ?? null
}

async function aplicarHash(datos: Datos, id: string, contrasenaPlano: string): Promise<User> {
  const user = datos.users.find((u) => u.id === id)
  if (user) {
    user.hash = await hashContrasena(contrasenaPlano)
    user.contrasena = undefined
  }
  return { ...user, contrasena: contrasenaPlano } as User
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  try {
    const url = new URL(request.url)
    const partes = url.pathname.replace(/^\/api\//, '').split('/')
    const ruta = partes[0] ?? ''
    const resto = partes.slice(1).join('/')
    const metodo = request.method
    const segura = esHttps(request)

    if (ruta === 'login' && metodo === 'POST') {
      const cuerpo = (await request.json().catch(() => null)) as { usuario?: string; contrasena?: string } | null
      if (!cuerpo?.usuario || !cuerpo.contrasena) return json({ error: 'Escribe tu usuario y contraseña.' }, 400)
      const { datos, version } = await cargarEstado(env)
      const user = datos.users.find((u) => u.correo.toLowerCase() === cuerpo.usuario.trim().toLowerCase())
      const valida = user ? await verificarContrasena(cuerpo.contrasena, user.hash ?? '') : false
      if (!user || !valida) return json({ error: 'Usuario o contraseña incorrectos.' }, 401)
      await env.DB.prepare('DELETE FROM sesiones WHERE expira_en < ?').bind(new Date().toISOString()).run()
      const token = tokenSesion()
      const expira = new Date(Date.now() + VIGENCIA_SESION_MS).toISOString()
      await env.DB.prepare('INSERT INTO sesiones (token, usuario_id, expira_en) VALUES (?, ?, ?)').bind(token, user.id, expira).run()
      return json({ usuario: publico(user), datos: publicoDatos(datos), version }, 200, {
        'Set-Cookie': cookieSesion(token, segura, VIGENCIA_SESION_MS / 1000),
      })
    }

    if (ruta === 'logout' && metodo === 'POST') {
      const token = valorCookie(request, COOKIE)
      if (token) await env.DB.prepare('DELETE FROM sesiones WHERE token = ?').bind(token).run()
      return json({ ok: true }, 200, { 'Set-Cookie': cookieSesionBorrada(segura) })
    }

    if (ruta === 'recuperar' && metodo === 'POST') {
      const cuerpo = (await request.json().catch(() => null)) as { usuario?: string } | null
      if (!cuerpo?.usuario) return json({ error: 'Escribe tu usuario.' }, 400)
      const primera = await cargarEstado(env)
      const r1 = solicitarRecuperacion(primera.datos, cuerpo.usuario)
      if (!r1.ok) return json({ error: r1.error }, 400)
      if (await guardarEstado(env, r1.datos, primera.version)) return json({ ok: true })
      const fresco = await cargarEstado(env)
      const r2 = solicitarRecuperacion(fresco.datos, cuerpo.usuario)
      if (!r2.ok) return json({ error: r2.error }, 400)
      if (!(await guardarEstado(env, r2.datos, fresco.version))) {
        return json({ error: 'Hubo demasiada actividad; intenta de nuevo.' }, 409)
      }
      return json({ ok: true })
    }

    const usuario = await usuarioDeSesion(request, env)

    if (ruta === 'datos' && metodo === 'GET') {
      if (!usuario) return json({ error: 'No hay sesión activa.' }, 401)
      const { datos, version } = await cargarEstado(env)
      return json({ usuario: publico(usuario), datos: publicoDatos(datos), version })
    }

    if (ruta === 'accion' && metodo === 'POST') {
      if (!usuario) return json({ error: 'No hay sesión activa.' }, 401)
      const cuerpo = (await request.json().catch(() => null)) as (Record<string, unknown> & { tipo?: string; version?: number }) | null
      const tipo = cuerpo?.tipo
      if (!tipo || !REDUCTORES[tipo] || !PERMISOS[tipo]) return json({ error: 'Acción desconocida.' }, 400)
      const actor: Actor = { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre, carrera: usuario.carrera }
      if (!PERMISOS[tipo](actor)) return json({ error: 'No tienes permiso para esta acción.' }, 403)

      const { datos, version } = await cargarEstado(env)
      if (typeof cuerpo.version !== 'number' || cuerpo.version !== version) {
        return json({ error: 'Tu pantalla está desactualizada; se actualizó la información.', datos: publicoDatos(datos), version }, 409)
      }

      const resultado = REDUCTORES[tipo](datos, actor, cuerpo)
      if (!resultado.ok) return json({ error: resultado.error }, 400)

      const extraPrevia = (resultado.extra ?? {}) as Record<string, unknown>
      let extra: Record<string, unknown> = {}
      if (tipo === 'crearVocal' || tipo === 'crearAsesor' || tipo === 'restablecerContrasena') {
        const previo = resultado.extra as { usuario: User } | undefined
        if (previo?.usuario) {
          const copia = await aplicarHash(resultado.datos, previo.usuario.id, previo.usuario.contrasena ?? '')
          const sinHash = { ...copia, hash: undefined }
          extra = { usuario: sinHash }
        }
      } else if (tipo === 'cambiarContrasena') {
        const nueva = cuerpo.nueva
        if (typeof nueva === 'string') await aplicarHash(resultado.datos, usuario.id, nueva)
      } else if (tipo === 'resolverSolicitud') {
        // archivosAEliminar es interno del servidor; no se envía al cliente.
      } else {
        extra = extraPrevia
      }

      const guardado = await guardarEstado(env, resultado.datos, version)
      if (!guardado) {
        const fresco = await cargarEstado(env)
        return json(
          {
            error: 'Otra persona actualizó la información al mismo tiempo; se refrescó tu pantalla.',
            datos: publicoDatos(fresco.datos),
            version: fresco.version,
          },
          409,
        )
      }

      if (tipo === 'resolverSolicitud') {
        const archivosAEliminar = (resultado.extra as { archivosAEliminar?: string[] } | undefined)?.archivosAEliminar ?? []
        for (const clave of archivosAEliminar) {
          await env.ARCHIVOS.delete(clave).catch(() => undefined)
        }
      }

      return json({ datos: publicoDatos(resultado.datos), version: version + 1, extra: Object.keys(extra).length ? extra : undefined })
    }

    if (ruta === 'archivos') {
      if (!usuario) return json({ error: 'No hay sesión activa.' }, 401)
      if (metodo === 'POST') {
        const form = await request.formData().catch(() => null)
        const archivo = form?.get('archivo')
        if (!(archivo instanceof File)) return json({ error: 'No se recibió el archivo.' }, 400)
        if (archivo.size === 0) return json({ error: 'El archivo está vacío.' }, 400)
        if (archivo.size > MAX_ARCHIVO) return json({ error: 'El archivo pesa más de 10 MB.' }, 400)
        const nombreLimpio = archivo.name.replace(/[^\w.-]+/g, '-').slice(-80) || 'documento'
        const clave = `revisiones/${nuevoId()}-${nombreLimpio}`
        await env.ARCHIVOS.put(clave, await archivo.arrayBuffer(), {
          httpMetadata: { contentType: archivo.type || 'application/octet-stream' },
        })
        return json({ clave })
      }
      if (metodo === 'GET' && resto) {
        const clave = decodeURIComponent(resto)
        const { datos } = await cargarEstado(env)
        const revision = datos.revisiones.find((r) => r.archivo.clave === clave)
        const asesorado = revision ? datos.asesorados.find((a) => a.id === revision.asesoradoId) : undefined
        const actor: Actor = { id: usuario.id, rol: usuario.rol, nombre: usuario.nombre, carrera: usuario.carrera }
        const permitido =
          actor.rol === 'admin' ||
          (actor.rol === 'vocal' && asesorado?.carrera === actor.carrera) ||
          (actor.rol === 'asesor' && !!asesorado && asesorado.asignaciones.some((x) => x.asesorId === actor.id))
        if (!revision || !asesorado || !permitido) return json({ error: 'No tienes acceso a este archivo.' }, 403)
        const objeto = await env.ARCHIVOS.get(clave)
        if (!objeto) return json({ error: 'El archivo ya no existe.' }, 404)
        return new Response(objeto.body, {
          headers: {
            'Content-Type': objeto.httpMetadata?.contentType ?? 'application/octet-stream',
            'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(revision.archivo.nombre)}`,
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      }
    }

    return json({ error: 'Ruta no encontrada.' }, 404)
  } catch (error) {
    console.error('[api]', error)
    return json({ error: 'Error interno del servidor.' }, 500)
  }
}
