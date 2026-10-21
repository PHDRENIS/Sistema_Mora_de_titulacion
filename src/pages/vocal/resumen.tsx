import { useNavigate } from 'react-router-dom'
import { useMemo } from 'react'
import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FilaTitulo } from '@/components/fila-titulo'
import { TiraKPIs } from '@/components/tira-kpis'
import { Vacio } from '@/components/vacio'
import { fechaCorta, horaLegible } from '@/lib/format'
import { useDB, useUsuarioActual, procesoAbierto } from '@/store/db'

export default function Resumen() {
  const nav = useNavigate()
  const usuario = useUsuarioActual()
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const revisiones = useDB((s) => s.revisiones)
  const proceso = useDB((s) => s.proceso)
  const salas = useDB((s) => s.salas)

  const carrera = usuario?.carrera ?? ''
  const mios = useMemo(() => asesorados.filter((a) => a.carrera === carrera), [asesorados, carrera])
  const miosIds = new Set(mios.map((a) => a.id))
  const porRevisar = revisiones.filter((r) => miosIds.has(r.asesoradoId) && r.estado === 'pendiente')

  const abierta = procesoAbierto({ proceso })
  const programadaFutura = proceso.estado === 'guardado' && proceso.abreEn !== null && Date.now() < new Date(proceso.abreEn).getTime()
  const mostrarAgenda = proceso.estado !== 'borrador'

  if (!usuario) return null

  return (
    <>
      <FilaTitulo
        titulo="Resumen"
        subline={
          porRevisar.length > 0
            ? `Hay ${porRevisar.length} ${porRevisar.length === 1 ? 'revisión' : 'revisiones'} de tu carrera esperando veredicto.`
            : `Todo al día en ${carrera}: sin revisiones pendientes.`
        }
      />
      <TiraKPIs
        datos={[
          { etiqueta: 'Asesorados de tu carrera', valor: mios.length },
          { etiqueta: 'Asesores', valor: users.filter((u) => u.rol === 'asesor').length },
          { etiqueta: 'Revisiones por revisar', valor: porRevisar.length, principal: true },
        ]}
      />
      {mostrarAgenda ? (
        <Card className="mt-6">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
              <p className="min-w-0 text-sm">
                {abierta
                  ? `El proceso de inscripción está abierto: ${salas.length} ${salas.length === 1 ? 'sala' : 'salas'} disponibles para asignar.`
                  : programadaFutura && proceso.abreEn !== null
                    ? `El proceso de inscripción se abre el ${fechaCorta(proceso.abreEn)} a las ${horaLegible(proceso.abreEn)}`
                    : 'El proceso de inscripción está cerrado por Coordinación.'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => nav('/vocal/examenes')}>
              Ver calendario
            </Button>
          </CardContent>
        </Card>
      ) : null}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revisiones por revisar</CardTitle>
            <CardDescription>Entregas de asesorados de {carrera}.</CardDescription>
          </CardHeader>
          <CardContent>
            {porRevisar.length === 0 ? (
              <Vacio>No hay revisiones pendientes de veredicto.</Vacio>
            ) : (
              <div className="divide-y divide-rule">
                {porRevisar.slice(0, 6).map((r) => {
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
                        onClick={() => nav(`/vocal/asesorados/${asesorado.id}`)}
                        className="shrink-0 text-sm text-primary hover:underline underline-offset-4"
                      >
                        Revisar
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Asesorados de tu carrera</CardTitle>
            <CardDescription>Con los puestos del sínodo que llevan asignados.</CardDescription>
          </CardHeader>
          <CardContent>
            {mios.length === 0 ? (
              <Vacio>Sin asesorados todavía. Da de alta el primero desde Asesorados.</Vacio>
            ) : (
              <div className="divide-y divide-rule">
                {mios.map((a) => {
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{a.nombre}</p>
                        <p className="num mt-0.5 text-xs text-muted-foreground">{a.matricula}</p>
                      </div>
                      <p className="num shrink-0 text-xs text-muted-foreground">{a.asignaciones.length}/4 sinodales</p>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
