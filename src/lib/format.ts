const fmtFecha = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })
const fmtFechaCorta = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' })

export function fechaCorta(iso: string): string {
  return fmtFecha.format(new Date(iso))
}

export function fechaMes(iso: string): string {
  return fmtFechaCorta.format(new Date(iso))
}

export function tamanoLegible(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function haceDias(iso: string): string {
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`
  return fechaMes(iso)
}

const fmtDia = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

export function sumarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(':').map(Number)
  const total = h * 60 + m + minutos
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function diaLegible(isoDia: string): string {
  const [y, m, d] = isoDia.split('-').map(Number)
  const texto = fmtDia.format(new Date(y, m - 1, d))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const fmtHora = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })

export function horaLegible(iso: string): string {
  return fmtHora.format(new Date(iso))
}

export function hoyISO(): string {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}-${String(ahora.getDate()).padStart(2, '0')}`
}
