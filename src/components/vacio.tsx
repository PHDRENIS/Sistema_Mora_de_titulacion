import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Vacio({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground', className)}>
      {children}
    </div>
  )
}
