import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FilaTitulo } from '@/components/fila-titulo'
import { TiraKPIs } from '@/components/tira-kpis'
import { Vacio } from '@/components/vacio'
import { SolicitudPendiente } from '@/components/solicitud-pendiente'
import { fechaCorta, haceDias } from '@/lib/format'
import { useDB } from '@/store/db'

export default function Resumen() {
  const nav = useNavigate()
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const revisiones = useDB((s) => s.revisiones)
  const solicitudes = useDB((s) => s.solicitudes)
  const notificaciones = useDB((s) => s.notificaciones)
  const admin = useDB((s) => s.users.find((u) => u.rol === 'admin'))

  const pendientes = useMemo(() => solicitudes.filter((s) => s.estado === 'pendiente'), [solicitudes])
  const revPendientes = useMemo(
    () =>
      revisiones
        .filter((r) => r.estado === 'pendiente' && !solicitudes.some((x) => x.asesoradoId === r.asesoradoId && x.estado === 'pendiente'))
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
    [revisiones, solicitudes],
  )
  const notificacionesAdmin = useMemo(
    () => notificaciones.filter((n) => n.para === admin?.id).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)).slice(0, 5),
    [notificaciones, admin],
  )

  const hallazgo =
    pendientes.length + revPendientes.length > 0
      ? `${pendientes.length} ${pendientes.length === 1 ? 'solicitud' : 'solicitudes'} de baja y ${revPendientes.length} ${revPendientes.length === 1 ? 'revisión' : 'revisiones'} esperan tu decisión.`
      : 'Todo al día: no hay solicitudes ni revisiones pendientes.'

  return (
    <>
      <FilaTitulo titulo="Resumen" subline={hallazgo} />
      <TiraKPIs
        datos={[
          { etiqueta: 'Vocales', valor: users.filter((u) => u.rol === 'vocal').length },
          { etiqueta: 'Asesores', valor: users.filter((u) => u.rol === 'asesor').length },
          { etiqueta: 'Asesorados activos', valor: asesorados.length },
          { etiqueta: 'Bajas pendientes', valor: pendientes.length, principal: true },
        ]}
      />
      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_400px]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Solicitudes de baja</CardTitle>
              <a href="#/admin/solicitudes" className="text-sm text-primary hover:underline underline-offset-4">
                Ver todas
              </a>
            </div>
            <CardDescription>Bajas que solicitaron los asesores. Acepta para eliminar el asesorado o rechaza para conservarlo.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendientes.length === 0 ? (
              <Vacio>No hay solicitudes de baja pendientes.</Vacio>
            ) : (
              <div className="divide-y divide-rule">
                {pendientes.slice(0, 5).map((s) => (
                  <SolicitudPendiente key={s.id} solicitud={s} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revisiones por revisar</CardTitle>
            <CardDescription>Entregas de los asesores que aún no tienen veredicto.</CardDescription>
          </CardHeader>
          <CardContent>
            {revPendientes.length === 0 ? (
              <Vacio>No hay revisiones pendientes de veredicto.</Vacio>
            ) : (
              <div className="divide-y divide-rule">
                {revPendientes.slice(0, 5).map((r) => {
                  const asesorado = asesorados.find((a) => a.id === r.asesoradoId)
                  if (!asesorado) return null
                  return (
                    <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{asesorado.nombre}</p>
                        <p className="num mt-0.5 text-xs text-muted-foreground">
                          Revisión {r.numero} · {fechaCorta(r.fecha)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => nav(`/admin/asesorados/${asesorado.id}`)}
                        className="shrink-0 text-sm text-primary hover:underline underline-offset-4"
                      >
                        Revisar
                      </button>
                    </div>
                  )
                })}
                {revPendientes.length > 5 ? <p className="pt-2 text-xs text-muted-foreground">Y {revPendientes.length - 5} más…</p> : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Asesorados por asesor</CardTitle>
            <CardDescription>Abre el perfil de cada asesor para ver su grupo completo.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-rule">
              {users
                .filter((u) => u.rol === 'asesor')
                .map((a) => {
                  const cuenta = asesorados.filter((x) => x.asignaciones.some((y) => y.asesorId === a.id)).length
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => nav(`/admin/asesores/${a.id}`)}
                      className="flex w-full items-center justify-between gap-3 py-2.5 text-left first:pt-0 last:pb-0"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{a.nombre}</span>
                        <span className="block truncate text-xs text-muted-foreground">{a.correo}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                        <span className="num">{cuenta}</span>
                        <ChevronRight className="size-4" />
                      </span>
                    </button>
                  )
                })}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Actividad reciente</CardTitle>
            <CardDescription>Últimos avisos que recibiste.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            {notificacionesAdmin.length === 0 ? (
              <Vacio>Sin actividad todavía.</Vacio>
            ) : (
              <div className="divide-y divide-rule">
                {notificacionesAdmin.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="flex min-w-0 items-start gap-2.5">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.leida ? 'bg-border' : 'bg-primary'}`} />
                      <span className={n.leida ? 'min-w-0 text-sm text-muted-foreground' : 'min-w-0 text-sm font-medium'}>{n.mensaje}</span>
                    </span>
                    <span className="num shrink-0 text-xs text-muted-foreground">{haceDias(n.creadoEn)}</span>
                  </div>
                ))}
              </div>
            )}
            <a href="#/admin/notificaciones" className="mt-auto pt-3 text-sm text-primary hover:underline underline-offset-4">
              Ver todas
            </a>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
