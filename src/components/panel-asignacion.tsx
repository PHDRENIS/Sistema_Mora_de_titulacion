import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { FilaTitulo } from '@/components/fila-titulo'
import { Vacio } from '@/components/vacio'
import { PUESTOS_SINODAL, useDB, useUsuarioActual, type CambioAsignacion, type PuestoSinodal } from '@/store/db'

const VACIO = 'sin-asignar'

export function PanelAsignacion() {
  const usuario = useUsuarioActual()
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const solicitudes = useDB((s) => s.solicitudes)
  const revisiones = useDB((s) => s.revisiones)
  const guardarAsignacion = useDB((s) => s.guardarAsignacion)

  const esVocal = usuario?.rol === 'vocal'
  const carreraVocal = usuario?.carrera

  const mios = useMemo(
    () => asesorados.filter((a) => (esVocal ? a.carrera === carreraVocal : true)),
    [asesorados, esVocal, carreraVocal],
  )

  const [elecciones, setElecciones] = useState<Record<string, Record<PuestoSinodal, string>>>({})

  const asesores = useMemo(() => users.filter((u) => u.rol === 'asesor'), [users])

  const cambios: CambioAsignacion[] = useMemo(
    () =>
      mios
        .map((a) => {
          const e = elecciones[a.id]
          if (!e) return null
          const asignaciones = PUESTOS_SINODAL.filter((p) => e[p.valor]).map((p) => ({ asesorId: e[p.valor], puesto: p.valor }))
          const iguales =
            asignaciones.length === a.asignaciones.length &&
            asignaciones.every((y) => a.asignaciones.some((x) => x.puesto === y.puesto && x.asesorId === y.asesorId))
          return iguales ? null : { asesoradoId: a.id, asignaciones }
        })
        .filter((c): c is CambioAsignacion => c !== null),
    [mios, elecciones],
  )

  if (!usuario) return null

  const elegir = (asesoradoId: string, puesto: PuestoSinodal, valor: string) => {
    setElecciones((e) => {
      const actuales: Record<PuestoSinodal, string> = e[asesoradoId] ?? {
        presidente: '',
        vocal: '',
        secretario: '',
        suplente: '',
      }
      return { ...e, [asesoradoId]: { ...actuales, [puesto]: valor === VACIO ? '' : valor } }
    })
  }

  const nombreAsesor = (id: string | undefined) => users.find((u) => u.id === id)?.nombre ?? ''

  const guardar = async () => {
    if (cambios.length === 0) return
    const ok = await guardarAsignacion(cambios)
    if (!ok) return
    setElecciones({})
    toast.success('Asignación guardada. Los asesores recibieron su puesto en el sínodo.')
  }

  return (
    <>
      <FilaTitulo
        titulo="Asignación del sínodo"
        subline={
          esVocal
            ? `Asesorados de ${carreraVocal} · ${cambios.length} ${cambios.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}`
            : `${mios.length} asesorados · ${cambios.length} ${cambios.length === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}`
        }
        accion={
          <Button onClick={guardar} disabled={cambios.length === 0}>
            Guardar cambios{cambios.length > 0 ? ` (${cambios.length})` : ''}
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-4">
          {mios.length === 0 ? (
            <Vacio>No hay asesorados{esVocal ? ` de ${carreraVocal}` : ''} todavía. Créalos desde Asesorados.</Vacio>
          ) : (
            <div className="divide-y divide-rule">
              {mios.map((a) => {
                const eleccion = elecciones[a.id] ?? {
                  presidente: a.asignaciones.find((x) => x.puesto === 'presidente')?.asesorId ?? '',
                  vocal: a.asignaciones.find((x) => x.puesto === 'vocal')?.asesorId ?? '',
                  secretario: a.asignaciones.find((x) => x.puesto === 'secretario')?.asesorId ?? '',
                  suplente: a.asignaciones.find((x) => x.puesto === 'suplente')?.asesorId ?? '',
                }
                const enUso = Object.entries(eleccion).filter(([, v]) => v).map(([, v]) => v)
                return (
                  <div key={a.id} className="py-3">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="truncate text-sm font-medium">{a.nombre}</p>
                        {solicitudes.some((x) => x.asesoradoId === a.id && x.estado === 'pendiente') ? <Badge variant="warn">Baja pendiente</Badge> : null}
                      </div>
                      <p className="num text-xs text-muted-foreground sm:shrink-0">
                        {a.matricula} · {a.carrera}
                      </p>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {PUESTOS_SINODAL.map((p) => {
                        const valor = eleccion[p.valor]
                        const original = a.asignaciones.find((x) => x.puesto === p.valor)?.asesorId ?? ''
                        const cambiado = valor !== original
                        return (
                          <div key={p.valor} className="grid grid-cols-1 gap-1">
                            <p className="text-xs text-muted-foreground">{p.etiqueta}</p>
                            <Select value={valor || VACIO} onValueChange={(v) => elegir(a.id, p.valor, v)}>
                              <SelectTrigger className={cambiado ? 'border-ok-ink/50' : undefined}>
                                <SelectValue placeholder="Sin asignar" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={VACIO}>Sin asignar</SelectItem>
                                {asesores.map((x) => (
                                  <SelectItem key={x.id} value={x.id} disabled={enUso.includes(x.id) && x.id !== valor}>
                                    {x.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {cambiado ? (
                              <p className="text-xs text-ok-ink">
                                {original ? `${nombreAsesor(original)} → ${nombreAsesor(valor)}` : `Nuevo: ${nombreAsesor(valor)}`}
                              </p>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {revisiones.filter((r) => r.estado === 'pendiente' && mios.some((m) => m.id === r.asesoradoId)).length === 0 ? null : (
            <p className="pt-3 text-xs text-muted-foreground">
              Tip: reasignar puestos no cambia el estado de las revisiones pendientes.
            </p>
          )}
        </CardContent>
      </Card>
    </>
  )
}
