import type { ReactNode } from 'react'

export function PozoDatos({ filas }: { filas: { etiqueta: string; valor: ReactNode }[] }) {
  return (
    <div className="grid gap-x-8 gap-y-2.5 rounded-lg bg-field px-4 py-3 sm:grid-cols-2">
      {filas.map((f) => (
        <div key={f.etiqueta} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span className="w-24 shrink-0 text-xs text-muted-foreground">{f.etiqueta}</span>
          <span className="min-w-0 truncate text-sm">{f.valor}</span>
        </div>
      ))}
    </div>
  )
}
