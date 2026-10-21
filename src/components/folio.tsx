import { Download, FileText } from 'lucide-react'
import { EstadoPill } from '@/components/estado-pill'
import { descargarRevisionConToast } from '@/lib/descargar'
import { fechaCorta, tamanoLegible } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Revision } from '@/store/db'

const PUNTO: Record<Revision['estado'], string> = {
  pendiente: 'bg-neutral-ink',
  aceptada: 'bg-ok-ink',
  con_observaciones: 'bg-warn-ink',
  rechazada: 'bg-bad-ink',
}

export function Folio({ revision, accion }: { revision: Revision; accion?: React.ReactNode }) {
  return (
    <li className="relative pl-6">
      <span className={cn('absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-card', PUNTO[revision.estado])} />
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <p className="text-sm font-semibold">Revisión {revision.numero}</p>
          <EstadoPill estado={revision.estado} />
        </div>
        <p className="num text-xs text-muted-foreground">{fechaCorta(revision.fecha)}</p>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{revision.descripcion}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void descargarRevisionConToast(revision.archivo)}
          className="inline-flex h-7 min-w-0 items-center gap-1.5 rounded-md border bg-field px-2 text-[13px] text-foreground transition-colors hover:bg-secondary/60"
        >
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="max-w-48 truncate">{revision.archivo.nombre}</span>
          <span className="num shrink-0 text-muted-foreground">{tamanoLegible(revision.archivo.tamano)}</span>
          <Download className="size-3.5 shrink-0 text-muted-foreground" />
        </button>
        {accion}
      </div>
      {revision.nota ? (
        <div className="mt-2.5 border-l-2 border-foreground/15 pl-3">
          <p className="text-xs text-muted-foreground">
            Nota de la coordinación{revision.revisadoEn ? ` · ${fechaCorta(revision.revisadoEn)}` : ''}
          </p>
          <p className="mt-0.5 text-sm">{revision.nota}</p>
        </div>
      ) : null}
    </li>
  )
}

export function ListaFolios({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ol className={cn('relative space-y-6 border-l border-border pl-4', className)}>{children}</ol>
}
