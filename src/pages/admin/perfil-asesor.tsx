import { useParams } from 'react-router-dom'
import { PanelPerfilAsesor } from '@/components/panel-perfil-asesor'

export default function PerfilAsesor() {
  const { id } = useParams()
  return <PanelPerfilAsesor id={id} baseRuta="/admin" />
}
