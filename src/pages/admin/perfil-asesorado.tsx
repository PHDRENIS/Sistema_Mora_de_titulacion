import { PanelExpediente } from '@/components/panel-expediente'

export default function PerfilAsesorado() {
  return <PanelExpediente baseRuta="/admin" puedeRevisar esAsesor={false} />
}
