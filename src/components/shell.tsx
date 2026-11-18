import { Bell, KeyRound, LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DialogoCambiarContrasena } from '@/components/dialogo-cambiar-contrasena'
import { cn } from '@/lib/utils'
import { useUsuarioActual, useDB } from '@/store/db'

const CLAVE_SIDEBAR = 'sidebar-colapsado'

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
  const [colapsado, setColapsado] = useState(() => localStorage.getItem(CLAVE_SIDEBAR) === '1')
  const [cambiarContrasenaAbierto, setCambiarContrasenaAbierto] = useState(false)

  const alternarSidebar = () => {
    setColapsado((v) => {
      localStorage.setItem(CLAVE_SIDEBAR, v ? '0' : '1')
      return !v
    })
  }

  if (!usuario) return null

  return (
    <div className={`grid min-h-screen grid-cols-1 ${colapsado ? 'md:grid-cols-[76px_1fr]' : 'md:grid-cols-[260px_1fr]'}`}>
      <aside
        className={`flex min-w-0 flex-row items-center justify-between gap-3 px-3 py-2 md:flex-col md:items-stretch md:justify-start ${
          colapsado ? 'md:px-3 md:py-4' : 'md:p-4'
        }`}
      >
        <div className={cn('flex items-center gap-2.5', colapsado ? 'md:flex-col md:gap-2' : 'md:px-1')}>
          <img src="/logo-upn.svg" alt="Universidad Pedagógica Nacional" className="h-9 w-auto shrink-0" />
          <div className={cn('min-w-0', colapsado && 'md:hidden')}>
            <p className="truncate text-sm font-semibold leading-tight">Sistema Mora</p>
            <p className="truncate text-xs text-muted-foreground">{usuario.rol === 'admin' ? 'Titulación' : usuario.nombre}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            title={colapsado ? 'Expandir menú' : 'Colapsar menú'}
            onClick={alternarSidebar}
            className={cn('hidden text-muted-foreground md:inline-flex md:size-7', !colapsado && 'ml-auto')}
          >
            {colapsado ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
        </div>
        <nav className="flex min-w-0 flex-row gap-0.5 overflow-x-auto md:mt-8 md:flex-col md:gap-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={colapsado ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex h-10 shrink-0 items-center gap-2.5 rounded-md px-3 text-sm transition-colors outline-none',
                  colapsado && 'md:h-9 md:justify-center md:px-0',
                  isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground',
                )
              }
            >
              <span className="text-muted-foreground [&_svg]:size-4.5">{item.icon}</span>
              <span className={cn('whitespace-nowrap', colapsado && 'md:hidden')}>{item.label}</span>
              {item.cuenta ? (
                <span className={cn('num ml-auto hidden text-xs text-foreground md:inline', colapsado && 'md:hidden')}>
                  {item.cuenta}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="hidden md:mt-auto md:block">
          <div className={cn('mb-2 flex items-center gap-2.5 px-2', colapsado && 'md:justify-center md:px-0')}>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
              {usuario.nombre.slice(0, 2).toUpperCase()}
            </span>
            <div className={cn('min-w-0', colapsado && 'md:hidden')}>
              <p className="truncate text-[13px] font-medium leading-tight">{usuario.nombre}</p>
              <p className="truncate text-xs text-muted-foreground">{usuario.correo}</p>
            </div>
          </div>
          <div className="grid gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              title="Cambiar contraseña"
              className={cn('w-full justify-start', colapsado && 'md:justify-center md:px-0')}
              onClick={() => setCambiarContrasenaAbierto(true)}
            >
              <KeyRound />
              <span className={cn(colapsado && 'md:hidden')}>Cambiar contraseña</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Salir"
              className={cn('w-full justify-start', colapsado && 'md:justify-center md:px-0')}
              onClick={cerrarSesion}
            >
              <LogOut />
              <span className={cn(colapsado && 'md:hidden')}>Salir</span>
            </Button>
          </div>
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
      <DialogoCambiarContrasena abierto={cambiarContrasenaAbierto} onCerrar={() => setCambiarContrasenaAbierto(false)} />
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
