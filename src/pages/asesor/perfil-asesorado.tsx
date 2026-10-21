import { PanelExpediente } from '@/components/panel-expediente'

export default function PerfilAsesorado() {
  return <PanelExpediente baseRuta="/asesor" puedeRevisar={false} esAsesor />
}
