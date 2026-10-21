import { Badge } from '@/components/ui/badge'
import type { EstadoRevision } from '@/store/db'

const REVISION: Record<EstadoRevision, { label: string; variant: 'neutral' | 'ok' | 'warn' | 'bad' }> = {
  pendiente: { label: 'Pendiente', variant: 'neutral' },
  aceptada: { label: 'Aceptada', variant: 'ok' },
  con_observaciones: { label: 'Con observaciones', variant: 'warn' },
  rechazada: { label: 'Rechazada', variant: 'bad' },
}

export function EstadoPill({
  tipo = 'revision',
  estado,
  bajaPendiente,
}: {
  tipo?: 'revision' | 'asesorado'
  estado?: EstadoRevision
  bajaPendiente?: boolean
}) {
  if (tipo === 'asesorado') {
    return bajaPendiente ? (
      <Badge variant="warn">Baja pendiente</Badge>
    ) : (
      <Badge variant="ok">Activo</Badge>
    )
  }
  const info = REVISION[estado ?? 'pendiente']
  return <Badge variant={info.variant}>{info.label}</Badge>
}
