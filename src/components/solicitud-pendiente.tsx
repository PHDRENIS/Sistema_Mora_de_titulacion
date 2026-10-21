import { UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { fechaCorta } from '@/lib/format'
import { useDB, useUsuarioActual, type Solicitud } from '@/store/db'

export function SolicitudPendiente({ solicitud, soloVer = false }: { solicitud: Solicitud; soloVer?: boolean }) {
  const usuario = useUsuarioActual()
  const resolverSolicitud = useDB((s) => s.resolverSolicitud)
  const asesor = useDB((s) => s.users.find((u) => u.id === solicitud.solicitadoPor))
  const asesorado = useDB((s) => s.asesorados.find((a) => a.id === solicitud.asesoradoId))

  const resolver = (aceptar: boolean) => {
    if (!usuario) return
    resolverSolicitud(solicitud.id, aceptar, usuario.id)
    toast.success(aceptar ? 'Baja aceptada. El asesorado se eliminó.' : 'Baja rechazada. El asesorado sigue activo.')
  }

  if (!asesorado) return null

  return (
    <div className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Badge variant="warn">
            <UserMinus />
            Baja
          </Badge>
          <p className="truncate text-sm font-medium">{asesorado.nombre}</p>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Solicita {asesor?.nombre ?? '—'} · {fechaCorta(solicitud.creadoEn)}
        </p>
      </div>
      {soloVer ? null : (
        <div className="flex shrink-0 gap-1.5">
          <Button size="sm" variant="outline" onClick={() => resolver(true)}>
            Aceptar
          </Button>
          <Button size="sm" variant="ghost" className="text-bad-ink hover:bg-bad-bg hover:text-bad-ink" onClick={() => resolver(false)}>
            Rechazar
          </Button>
        </div>
      )}
    </div>
  )
}
