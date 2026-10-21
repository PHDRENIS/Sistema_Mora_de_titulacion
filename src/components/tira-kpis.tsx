import { cn } from '@/lib/utils'

export function TiraKPIs({ datos }: { datos: { etiqueta: string; valor: number; principal?: boolean }[] }) {
  const cols: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }
  return (
    <div className={cn('grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border', cols[datos.length] ?? 'md:grid-cols-4')}>
      {datos.map((d) => (
        <div key={d.etiqueta} className="bg-card p-4">
          <p className="text-xs text-muted-foreground">{d.etiqueta}</p>
          <p className={cn('num mt-1 font-semibold', d.principal ? 'text-3xl leading-8' : 'text-2xl')}>{d.valor}</p>
        </div>
      ))}
    </div>
  )
}
