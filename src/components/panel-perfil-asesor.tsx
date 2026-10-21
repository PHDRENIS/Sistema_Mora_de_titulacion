import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FilaTitulo } from '@/components/fila-titulo'
import { TiraKPIs } from '@/components/tira-kpis'
import { EstadoPill } from '@/components/estado-pill'
import { Vacio } from '@/components/vacio'
import { Volver } from '@/components/volver'
import { useDB, etiquetaPuesto } from '@/store/db'

export function PanelPerfilAsesor({ id, baseRuta }: { id: string | undefined; baseRuta: '/admin' | '/vocal' }) {
  const nav = useNavigate()
  const asesor = useDB((s) => s.users.find((u) => u.id === id && u.rol === 'asesor'))
  const asesoradosTodos = useDB((s) => s.asesorados)
  const solicitudes = useDB((s) => s.solicitudes)
  const revisiones = useDB((s) => s.revisiones)
  const [busqueda, setBusqueda] = useState('')

  const asesorados = useMemo(() => asesoradosTodos.filter((a) => a.asignaciones.some((x) => x.asesorId === id)), [asesoradosTodos, id])

  if (!asesor) {
    return (
      <>
        <Volver />
        <Vacio>No encontramos este asesor.</Vacio>
      </>
    )
  }

  const miasIds = new Set(asesorados.map((a) => a.id))
  const porRevisar = revisiones.filter((r) => miasIds.has(r.asesoradoId) && r.estado === 'pendiente').length
  const lista = asesorados.filter((a) => !busqueda.trim() || a.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) || a.matricula.includes(busqueda.trim()))

  return (
    <>
      <Volver />
      <FilaTitulo titulo={asesor.nombre} subline={asesor.correo} />
      <TiraKPIs
        datos={[
          { etiqueta: 'Asesorados', valor: asesorados.length },
          { etiqueta: 'Revisiones recibidas', valor: revisiones.filter((r) => miasIds.has(r.asesoradoId)).length },
          { etiqueta: 'Por revisar', valor: porRevisar },
        ]}
      />
      <Card className="mt-6">
        <CardContent className="pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold">Asesorados ({asesorados.length})</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar" className="h-8 w-56 pl-8" />
            </div>
          </div>
          {lista.length === 0 ? (
            <Vacio>Este asesor aún no tiene asesorados asignados.</Vacio>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Carrera</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Revisiones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lista.map((a) => {
                  const n = revisiones.filter((r) => r.asesoradoId === a.id).length
                  const baja = solicitudes.some((s) => s.asesoradoId === a.id && s.estado === 'pendiente')
                  const puesto = a.asignaciones.find((x) => x.asesorId === id)
                  return (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => nav(`${baseRuta}/asesorados/${a.id}`)}>
                      <TableCell className="max-w-56 truncate font-medium text-primary">{a.nombre}</TableCell>
                      <TableCell className="num text-muted-foreground">{a.matricula}</TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">{a.carrera}</TableCell>
                      <TableCell className="text-muted-foreground">{puesto ? etiquetaPuesto(puesto.puesto) : '—'}</TableCell>
                      <TableCell>
                        <EstadoPill tipo="asesorado" bajaPendiente={baja} />
                      </TableCell>
                      <TableCell className="num text-right">{n}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
