import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export function Volver() {
  const nav = useNavigate()
  return (
    <Button variant="ghost" size="sm" className="-ml-3 mb-3 text-muted-foreground" onClick={() => nav(-1)}>
      <ArrowLeft />
      Volver
    </Button>
  )
}
