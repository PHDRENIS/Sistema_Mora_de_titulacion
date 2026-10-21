import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { AdminLayout, AsesorLayout, VocalLayout, RequiereRol } from '@/layouts'
import Login from '@/pages/login'
import AdminResumen from '@/pages/admin/resumen'
import AdminVocales from '@/pages/admin/vocales'
import AdminAsesores from '@/pages/admin/asesores'
import AdminPerfilAsesor from '@/pages/admin/perfil-asesor'
import AdminAsesorados from '@/pages/admin/asesorados'
import AdminPerfilAsesorado from '@/pages/admin/perfil-asesorado'
import AdminSolicitudes from '@/pages/admin/solicitudes'
import AdminNotificaciones from '@/pages/admin/notificaciones'
import AdminExamenes from '@/pages/admin/examenes'
import VocalResumen from '@/pages/vocal/resumen'
import VocalAsesores from '@/pages/vocal/asesores'
import VocalPerfilAsesor from '@/pages/vocal/perfil-asesor'
import VocalAsesorados from '@/pages/vocal/asesorados'
import VocalPerfilAsesorado from '@/pages/vocal/perfil-asesorado'
import VocalAsignacion from '@/pages/vocal/asignacion'
import VocalNotificaciones from '@/pages/vocal/notificaciones'
import VocalExamenes from '@/pages/vocal/examenes'
import AsesorInicio from '@/pages/asesor/inicio'
import AsesorPerfilAsesorado from '@/pages/asesor/perfil-asesorado'
import AsesorNotificaciones from '@/pages/asesor/notificaciones'
import { useUsuarioActual, rutaPorRol } from '@/store/db'

function Inicio() {
  const usuario = useUsuarioActual()
  if (!usuario) return <Navigate to="/login" replace />
  return <Navigate to={rutaPorRol(usuario.rol)} replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/login" element={<Login />} />
      <Route
        path="/admin"
        element={
          <RequiereRol rol="admin">
            <AdminLayout>
              <Outlet />
            </AdminLayout>
          </RequiereRol>
        }
      >
        <Route index element={<AdminResumen />} />
        <Route path="vocales" element={<AdminVocales />} />
        <Route path="asesores" element={<AdminAsesores />} />
        <Route path="asesores/:id" element={<AdminPerfilAsesor />} />
        <Route path="asesorados" element={<AdminAsesorados />} />
        <Route path="asesorados/:id" element={<AdminPerfilAsesorado />} />
        <Route path="solicitudes" element={<AdminSolicitudes />} />
        <Route path="notificaciones" element={<AdminNotificaciones />} />
        <Route path="examenes" element={<AdminExamenes />} />
      </Route>
      <Route
        path="/vocal"
        element={
          <RequiereRol rol="vocal">
            <VocalLayout>
              <Outlet />
            </VocalLayout>
          </RequiereRol>
        }
      >
        <Route index element={<VocalResumen />} />
        <Route path="asesores" element={<VocalAsesores />} />
        <Route path="asesores/:id" element={<VocalPerfilAsesor />} />
        <Route path="asesorados" element={<VocalAsesorados />} />
        <Route path="asesorados/:id" element={<VocalPerfilAsesorado />} />
        <Route path="asignacion" element={<VocalAsignacion />} />
        <Route path="notificaciones" element={<VocalNotificaciones />} />
        <Route path="examenes" element={<VocalExamenes />} />
      </Route>
      <Route
        path="/asesor"
        element={
          <RequiereRol rol="asesor">
            <AsesorLayout>
              <Outlet />
            </AsesorLayout>
          </RequiereRol>
        }
      >
        <Route index element={<AsesorInicio />} />
        <Route path="asesorados/:id" element={<AsesorPerfilAsesorado />} />
        <Route path="notificaciones" element={<AsesorNotificaciones />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
