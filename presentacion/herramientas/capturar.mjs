import { spawn, execSync } from 'node:child_process'
import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const AQUI = dirname(fileURLToPath(import.meta.url))
const CAPTURAS = resolve(AQUI, '../capturas')
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PUERTO = 9223
const ORIGEN = 'http://127.0.0.1:4173'
const PERFIL = resolve(tmpdir(), 'captura-edge-perfil')

mkdirSync(CAPTURAS, { recursive: true })
rmSync(PERFIL, { recursive: true, force: true })

const edge = spawn(EDGE, [
  '--headless=new',
  `--remote-debugging-port=${PUERTO}`,
  `--user-data-dir=${PERFIL}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-gpu',
  '--window-size=1280,720',
  'about:blank',
], { detached: true, stdio: 'ignore' })
edge.unref()

function conectar(urlWs) {
  return new Promise((res, rej) => {
    const ws = new WebSocket(urlWs)
    let id = 0
    const pendientes = new Map()
    const oyentes = []
    ws.onopen = () =>
      res({
        send(metodo, params = {}) {
          return new Promise((res2, rej2) => {
            const i = ++id
            pendientes.set(i, { res: res2, rej: rej2 })
            ws.send(JSON.stringify({ id: i, method: metodo, params }))
          })
        },
        al(evento, fn) {
          oyentes.push({ evento, fn })
        },
        cerrar() {
          ws.close()
        },
      })
    ws.onerror = rej
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id && pendientes.has(msg.id)) {
        const { res: res2, rej: rej2 } = pendientes.get(msg.id)
        pendientes.delete(msg.id)
        msg.error ? rej2(new Error(msg.error.message)) : res2(msg.result)
      } else if (msg.method) {
        for (const o of oyentes) if (o.evento === msg.method) o.fn(msg.params)
      }
    }
  })
}

const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

async function objetivoPagina() {
  for (let i = 0; i < 40; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${PUERTO}/json/list`)).json()
      const pagina = lista.find((t) => t.type === 'page')
      if (pagina?.webSocketDebuggerUrl) return pagina
    } catch {}
    await dormir(500)
  }
  throw new Error('No apareció el objetivo de depuración de Edge.')
}

const objetivo = await objetivoPagina()
const cdp = await conectar(objetivo.webSocketDebuggerUrl)
await cdp.send('Page.enable')
await cdp.send('Runtime.enable')
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 720, deviceScaleFactor: 2, mobile: false })

let contador = 0
async function evalua(expresion, awaitPromise = false) {
  const r = await cdp.send('Runtime.evaluate', { expression: expresion, awaitPromise, returnByValue: true })
  if (r.exceptionDetails) throw new Error('JS: ' + JSON.stringify(r.exceptionDetails.exception?.description ?? r.exceptionDetails))
  return r.result?.value
}

const esperar = (ms) => evalua(`new Promise(r => setTimeout(r, ${ms}))`, true)

async function ir(ruta) {
  await evalua(`location.hash = '#${ruta}'`)
  await esperar(1100)
}

async function capturar(nombre, zoom = 1.5) {
  await evalua(`document.documentElement.style.zoom = ${zoom}; window.scrollTo(0, 0); undefined`)
  await esperar(400)
  const { data } = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(resolve(CAPTURAS, nombre + '.png'), Buffer.from(data, 'base64'))
  console.log('captura', nombre)
}

async function sesion(rol) {
  const cuentas = {
    admin: ['admin@escuela.mx', 'admin123'],
    vocal: ['martha.villalobos@escuela.mx', 'vocal123'],
    asesor: ['elena.ramirez@escuela.mx', 'asesor123'],
  }
  const [correo, pass] = cuentas[rol]
  await evalua(`window.__db.getState().iniciarSesion(${JSON.stringify(correo)}, ${JSON.stringify(pass)})`)
}

// ── Carga inicial ──────────────────────────────────────────────
await cdp.send('Page.navigate', { url: ORIGEN + '/' })
await evalua(`new Promise(r => { if (document.readyState !== 'loading') r(); else addEventListener('load', () => r()) })`, true)
await esperar(1500)
await evalua(`document.fonts.ready.then(() => undefined)`, true)

// 00 · Pantalla de acceso (sin sesión)
await ir('/login')
await capturar('00-login')

// ── Fase A · Datos base y proceso en borrador ──────────────────
await sesion('admin')
await evalua(`(async () => {
  const db = window.__db.getState()
  db.guardarAsignacion([
    { asesoradoId: 'as1', asignaciones: [ { asesorId: 'a1', puesto: 'presidente' }, { asesorId: 'a2', puesto: 'vocal' }, { asesorId: 'a3', puesto: 'secretario' } ] },
    { asesoradoId: 'as6', asignaciones: [ { asesorId: 'a1', puesto: 'vocal' } ] },
    { asesoradoId: 'as14', asignaciones: [ { asesorId: 'a1', puesto: 'secretario' } ] },
    { asesoradoId: 'as11', asignaciones: [ { asesorId: 'a4', puesto: 'presidente' }, { asesorId: 'a5', puesto: 'vocal' } ] },
    { asesoradoId: 'as2', asignaciones: [ { asesorId: 'a4', puesto: 'vocal' } ] },
  ])
  const dia = new Date()
  dia.setDate(dia.getDate() + ((8 - dia.getDay()) % 7 || 7))
  const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  const finDia = new Date(dia)
  finDia.setDate(finDia.getDate() + 5)
  db.crearSala('Auditorio A')
  db.crearSala('Aula B')
  const creados = db.generarSlots(iso(dia), iso(finDia))
  return { creados, slots: window.__db.getState().slots.length, salas: window.__db.getState().salas.length }
})()`, true)

await ir('/admin/examenes')
await capturar('01-admin-examenes-borrador')

// ── Fase B · Publicar proceso, asignar exámenes, revisiones y bajas ──
await evalua(`(async () => {
  const db = window.__db.getState()
  db.guardarProceso(new Date(Date.now() + 7 * 86400000).toISOString())
  db.abrirProceso()
  for (const asesoradoId of ['as1', 'as11', 'as21']) {
    const st = window.__db.getState()
    const ocupadas = new Set(st.slots.filter((s) => s.asesoradoId).map((s) => s.fecha + ' ' + s.horaInicio))
    const slot = st.slots.find((s) => !s.asesoradoId && !ocupadas.has(s.fecha + ' ' + s.horaInicio))
    if (slot) st.asignarExamen(slot.id, asesoradoId, 'v1')
  }
  const archivo = new File(['Documento de demostración'], 'documento-recepcional.pdf', { type: 'application/pdf' })
  await db.agregarRevision('as1', 'Documento recepcional: marco teórico y diseño metodológico completos.', archivo)
  await db.agregarRevision('as11', 'Avance del prototipo con resultados de las pruebas de campo.', archivo)
  const st = window.__db.getState()
  const rev1 = st.revisiones.find((r) => r.asesoradoId === 'as1' && r.numero === 1)
  if (rev1) st.revisarRevision(rev1.id, 'con_observaciones', 'Falta citar las fuentes del capítulo 3 y anexar los instrumentos.', 'admin')
  db.solicitarBaja('as2', 'a4')
  const st2 = window.__db.getState()
  const sol = st2.solicitudes.find((s) => s.asesoradoId === 'as2' && s.estado === 'pendiente')
  if (sol) st2.resolverSolicitud(sol.id, false, 'admin')
  db.solicitarBaja('as6', 'a1')
  return { slotsAsignados: window.__db.getState().slots.filter((s) => s.asesoradoId).length }
})()`, true)

// ── Capturas · Administrador ───────────────────────────────────
await ir('/admin')
await capturar('02-admin-resumen')
await ir('/admin/vocales')
await capturar('03-admin-vocales')
await ir('/admin/asesores')
await capturar('04-admin-asesores')
await ir('/admin/asesorados')
await capturar('05-admin-asesorados')
await ir('/admin/asesorados/as1')
await capturar('06-admin-perfil-asesorado')
await evalua(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Revisar')?.click()`)
await capturar('07-admin-revision-dialogo')
await ir('/admin/solicitudes')
await capturar('08-admin-solicitudes')
await ir('/admin/notificaciones')
await capturar('09-admin-notificaciones', 1.7)
await ir('/admin/examenes')
await capturar('10-admin-examenes-proceso')

await evalua(`(() => {
  const st = window.__db.getState()
  const slot = st.slots.find((s) => s.asesoradoId === 'as21')
  if (slot) st.liberarExamen(slot.id, 'admin')
})()`)

// ── Capturas · Vocal ───────────────────────────────────────────
await sesion('vocal')
await ir('/vocal')
await capturar('11-vocal-resumen', 1.7)
await ir('/vocal/asesorados')
await capturar('12-vocal-asesorados', 1.7)
await ir('/vocal/asignacion')
await capturar('13-vocal-asignacion', 1.7)
await ir('/vocal/examenes')
await capturar('14-vocal-examenes')
await evalua(`[...document.querySelectorAll('button[title="Asignar asesorado"]')][0]?.click()`)
await capturar('15-vocal-examenes-dialogo')
await ir('/vocal/notificaciones')
await capturar('16-vocal-notificaciones', 1.7)

// ── Capturas · Asesor ──────────────────────────────────────────
await sesion('asesor')
await ir('/asesor')
await capturar('17-asesor-inicio', 1.7)
await ir('/asesor/asesorados/as1')
await capturar('18-asesor-expediente', 1.7)
await evalua(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Agregar revisión')?.click()`)
await capturar('19-asesor-revision-dialogo')
await ir('/asesor/notificaciones')
await capturar('20-asesor-notificaciones', 1.7)

cdp.cerrar()
await dormir(300)
try {
  execSync(`taskkill /pid ${edge.pid} /t /f`, { stdio: 'ignore' })
} catch {}
try {
  rmSync(PERFIL, { recursive: true, force: true, maxRetries: 5, retryDelay: 1000 })
} catch {}
console.log('Listo.')
