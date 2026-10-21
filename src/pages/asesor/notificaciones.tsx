import { FilaTitulo } from '@/components/fila-titulo'
import { PanelNotificaciones } from '@/components/panel-notificaciones'

export default function Notificaciones() {
  return (
    <>
      <FilaTitulo titulo="Notificaciones" subline="Resultados de tus solicitudes y notas sobre tus revisiones." />
      <PanelNotificaciones />
    </>
  )
}
