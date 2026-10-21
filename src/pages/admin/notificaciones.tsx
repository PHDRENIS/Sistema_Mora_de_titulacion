import { FilaTitulo } from '@/components/fila-titulo'
import { PanelNotificaciones } from '@/components/panel-notificaciones'

export default function Notificaciones() {
  return (
    <>
      <FilaTitulo titulo="Notificaciones" subline="Avisos de solicitudes de baja y resultados de revisiones." />
      <PanelNotificaciones />
    </>
  )
}
