import { useMemo } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Vacio } from '@/components/vacio'
import { haceDias } from '@/lib/format'
import { useDB, useUsuarioActual } from '@/store/db'

export function PanelNotificaciones() {
  const usuario = useUsuarioActual()
  const todas = useDB((s) => s.notificaciones)
  const notificaciones = useMemo(
    () => todas.filter((n) => n.para === usuario?.id).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn)),
    [todas, usuario],
  )
  const marcarLeidas = useDB((s) => s.marcarLeidas)
  const marcarLeida = useDB((s) => s.marcarLeida)

  if (!usuario) return null
  const noLeidas = notificaciones.filter((n) => !n.leida).length

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{notificaciones.length} notificaciones</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={noLeidas === 0}
            onClick={async () => {
              const ok = await marcarLeidas()
              if (!ok) return
              toast.success('Notificaciones marcadas como leídas.')
            }}
          >
            Marcar todas como leídas
          </Button>
        </div>
        {notificaciones.length === 0 ? (
          <Vacio className="mt-2">Sin notificaciones. Aquí verás los resultados de tus solicitudes y revisiones.</Vacio>
        ) : (
          <div className="divide-y divide-rule">
            {notificaciones.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => marcarLeida(n.id)}
                className="flex w-full items-start justify-between gap-4 py-3 text-left first:pt-0 last:pb-0"
              >
                <span className="flex min-w-0 items-start gap-3">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.leida ? 'bg-border' : 'bg-primary'}`} />
                  <span className={n.leida ? 'min-w-0 text-sm text-muted-foreground' : 'min-w-0 text-sm font-medium text-foreground'}>
                    {n.mensaje}
                  </span>
                </span>
                <span className="num shrink-0 pt-0.5 text-xs text-muted-foreground">{haceDias(n.creadoEn)}</span>
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
