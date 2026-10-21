import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Bell, BookOpen, CalendarDays, Inbox, LayoutDashboard, Users, Gavel } from 'lucide-react'
import { AppShell, type ItemNav } from '@/components/shell'
import { useUsuarioActual, useDB, rutaPorRol } from '@/store/db'

export type RolRuta = 'admin' | 'vocal' | 'asesor'

export function RequiereRol({ rol, children }: { rol: RolRuta; children: ReactNode }) {
  const usuario = useUsuarioActual()
  if (!usuario) return <Navigate to="/login" replace />
  if (usuario.rol !== rol) return <Navigate to={rutaPorRol(usuario.rol)} replace />
  return <>{children}</>
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const usuario = useUsuarioActual()
  const pendientes = useDB((s) => s.solicitudes.filter((x) => x.estado === 'pendiente').length)
  const noLeidas = useDB((s) => s.notificaciones.filter((n) => n.para === usuario?.id && !n.leida).length)
  const items: ItemNav[] = [
    { to: '/admin', label: 'Resumen', icon: <LayoutDashboard />, end: true },
    { to: '/admin/vocales', label: 'Vocales', icon: <Gavel /> },
    { to: '/admin/asesores', label: 'Asesores', icon: <Users /> },
    { to: '/admin/asesorados', label: 'Asesorados', icon: <BookOpen /> },
    { to: '/admin/examenes', label: 'Exámenes', icon: <CalendarDays /> },
    { to: '/admin/solicitudes', label: 'Solicitudes', icon: <Inbox />, cuenta: pendientes },
    { to: '/admin/notificaciones', label: 'Notificaciones', icon: <Bell />, cuenta: noLeidas },
  ]
  return <AppShell items={items}>{children}</AppShell>
}

export function VocalLayout({ children }: { children: ReactNode }) {
  const usuario = useUsuarioActual()
  const noLeidas = useDB((s) => s.notificaciones.filter((n) => n.para === usuario?.id && !n.leida).length)
  const items: ItemNav[] = [
    { to: '/vocal', label: 'Resumen', icon: <LayoutDashboard />, end: true },
    { to: '/vocal/asesores', label: 'Asesores', icon: <Users /> },
    { to: '/vocal/asesorados', label: 'Asesorados', icon: <BookOpen /> },
    { to: '/vocal/asignacion', label: 'Asignación', icon: <Inbox /> },
    { to: '/vocal/examenes', label: 'Exámenes', icon: <CalendarDays /> },
    { to: '/vocal/notificaciones', label: 'Notificaciones', icon: <Bell />, cuenta: noLeidas },
  ]
  return <AppShell items={items}>{children}</AppShell>
}

export function AsesorLayout({ children }: { children: ReactNode }) {
  const usuario = useUsuarioActual()
  const noLeidas = useDB((s) => s.notificaciones.filter((n) => n.para === usuario?.id && !n.leida).length)
  const items: ItemNav[] = [
    { to: '/asesor', label: 'Mis asesorados', icon: <BookOpen />, end: true },
    { to: '/asesor/notificaciones', label: 'Notificaciones', icon: <Bell />, cuenta: noLeidas },
  ]
  return <AppShell items={items}>{children}</AppShell>
}
