import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function FilaTitulo({ titulo, subline, accion, pill }: { titulo: string; subline?: ReactNode; accion?: ReactNode; pill?: ReactNode }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-6">
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="truncate text-2xl font-semibold tracking-[-0.01em]">{titulo}</h1>
          {pill}
        </div>
        {subline ? <p className="mt-1 text-sm text-muted-foreground">{subline}</p> : null}
      </div>
      {accion ? <div className={cn('flex shrink-0 items-center gap-2')}>{accion}</div> : null}
    </div>
  )
}
