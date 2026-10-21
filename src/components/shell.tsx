import { Bell } from 'lucide-react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { LogOut, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUsuarioActual, useDB } from '@/store/db'

export interface ItemNav {
  to: string
  label: string
  icon: ReactNode
  cuenta?: number
  end?: boolean
}

export function AppShell({ items, children }: { items: ItemNav[]; children: ReactNode }) {
  const usuario = useUsuarioActual()
  const cerrarSesion = useDB((s) => s.cerrarSesion)

  if (!usuario) return null

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[232px_1fr]">
      <aside className="flex min-w-0 flex-row items-center justify-between gap-3 px-3 py-2 md:flex-col md:items-stretch md:justify-start md:p-4">
        <div className="flex items-center gap-2.5 md:px-2 md:py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="size-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight">Sistema Mora</p>
            <p className="truncate text-xs text-muted-foreground">{usuario.rol === 'admin' ? 'Titulación' : usuario.nombre}</p>
          </div>
        </div>
        <nav className="flex min-w-0 flex-row gap-0.5 overflow-x-auto md:mt-6 md:flex-col">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex h-8 shrink-0 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors outline-none',
                  isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                )
              }
            >
              <span className="text-muted-foreground [&_svg]:size-4">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
              {item.cuenta ? <span className="num ml-auto hidden text-xs text-foreground md:inline">{item.cuenta}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:mt-auto md:block">
          <div className="mb-2 flex items-center gap-2.5 px-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
              {usuario.nombre.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium leading-tight">{usuario.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{usuario.correo}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={cerrarSesion}>
            <LogOut />
            Salir
          </Button>
        </div>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={cerrarSesion}>
          <LogOut />
        </Button>
      </aside>
      <main className="min-w-0 md:h-screen md:pr-2 md:pb-2 md:pt-2">
        <div className="md:h-full md:overflow-y-auto md:rounded-xl md:border bg-card">
          <div className="mx-auto max-w-[1200px] px-5 py-6 md:px-8 md:py-7">{children}</div>
        </div>
      </main>
    </div>
  )
}

export function MarcaNotificaciones({ cuenta }: { cuenta: number }) {
  return (
    <span className="relative inline-flex">
      <Bell />
      {cuenta > 0 ? <span className="num absolute -right-2 -top-2 rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground">{cuenta}</span> : null}
    </span>
  )
}
