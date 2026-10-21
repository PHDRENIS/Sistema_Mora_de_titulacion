import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EstadoPill } from '@/components/estado-pill'
import { FilaTitulo } from '@/components/fila-titulo'
import { Vacio } from '@/components/vacio'
import { haceDias } from '@/lib/format'
import { useDB, useUsuarioActual, etiquetaPuesto } from '@/store/db'

export default function Inicio() {
  const usuario = useUsuarioActual()
  const asesorados = useDB((s) => s.asesorados)
  const revisiones = useDB((s) => s.revisiones)
  const solicitudes = useDB((s) => s.solicitudes)

  const mios = useMemo(
    () => asesorados.filter((a) => a.asignaciones.some((x) => x.asesorId === usuario?.id)).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    [asesorados, usuario],
  )
  const porRevisar = revisiones.filter(
    (r) => mios.some((m) => m.id === r.asesoradoId) && r.estado === 'pendiente' && !solicitudes.some((s) => s.asesoradoId === r.asesoradoId && s.estado === 'pendiente'),
  ).length

  if (!usuario) return null

  return (
    <>
      <FilaTitulo
        titulo="Mis asesorados"
        subline={
          mios.length === 0
            ? 'La coordinación te asignará tus asesorados. Aquí verás tu lista.'
            : `${mios.length} ${mios.length === 1 ? 'expediente' : 'expedientes'} · ${porRevisar} revisiones pendientes de revisión`
        }
      />
      {mios.length === 0 ? (
        <Vacio className="py-10">Sin asesorados asignados todavía. Cuando la coordinación te los asigne, aparecerán aquí y te llegará una notificación.</Vacio>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {mios.map((a) => {
            const mias = revisiones.filter((r) => r.asesoradoId === a.id)
            const ultima = mias.reduce((max, r) => (r.fecha > max ? r.fecha : max), '')
            const baja = solicitudes.some((s) => s.asesoradoId === a.id && s.estado === 'pendiente')
            const puesto = a.asignaciones.find((x) => x.asesorId === usuario?.id)
            return (
              <Card key={a.id} className={`gap-0 p-4 transition-colors hover:border-input ${baja ? 'border-dashed' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/asesor/asesorados/${a.id}`} className="min-w-0 truncate text-[15px] font-semibold text-primary hover:underline underline-offset-4">
                    {a.nombre}
                  </Link>
                  <EstadoPill tipo="asesorado" bajaPendiente={baja} />
                </div>
                <p className="num mt-0.5 text-xs text-muted-foreground">Matrícula {a.matricula}</p>
                <p className="mt-2 text-sm">{a.carrera}</p>
                {puesto ? <p className="mt-1 text-xs text-muted-foreground">Tu puesto en el sínodo: {etiquetaPuesto(puesto.puesto)}</p> : null}
                <div className="mt-3 flex items-center justify-between border-t border-rule pt-3">
                  <span className="num text-xs text-muted-foreground">
                    {mias.length} {mias.length === 1 ? 'revisión' : 'revisiones'}
                    {ultima ? ` · Última ${haceDias(ultima)}` : ''}
                  </span>
                  <Link to={`/asesor/asesorados/${a.id}`} className="inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-4">
                    Expediente
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
