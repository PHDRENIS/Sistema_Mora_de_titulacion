import { FilaTitulo } from '@/components/fila-titulo'
import { PanelNotificaciones } from '@/components/panel-notificaciones'

export default function Notificaciones() {
  return (
    <>
      <FilaTitulo titulo="Notificaciones" subline="Resultados de revisiones de tu carrera." />
      <PanelNotificaciones />
    </>
  )
}
