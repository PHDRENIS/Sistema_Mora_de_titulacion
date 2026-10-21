import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EstadoPill } from '@/components/estado-pill'
import { FilaTitulo } from '@/components/fila-titulo'
import { Vacio } from '@/components/vacio'
import { NuevoAsesorado } from '@/components/nuevo-asesorado'
import { tieneBajaPendiente, etiquetaPuesto, useDB, useUsuarioActual } from '@/store/db'

export function PanelAsesorados({ baseRuta }: { baseRuta: '/admin' | '/vocal' }) {
  const nav = useNavigate()
  const usuario = useUsuarioActual()
  const asesorados = useDB((s) => s.asesorados)
  const users = useDB((s) => s.users)
  const revisiones = useDB((s) => s.revisiones)
  const solicitudes = useDB((s) => s.solicitudes)
  const carreras = useMemo(
    () =>
      [
        ...new Set([
          ...users.filter((u) => u.rol === 'vocal' && u.carrera).map((u) => u.carrera as string),
          ...asesorados.map((a) => a.carrera),
        ]),
      ].sort((a, b) => a.localeCompare(b)),
    [users, asesorados],
  )
  const [busqueda, setBusqueda] = useState('')
  const esVocal = usuario?.rol === 'vocal'
  const carreraVocal = usuario?.carrera ?? ''

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return asesorados
      .filter((a) => (esVocal ? a.carrera === carreraVocal : true))
      .filter((a) => !q || a.nombre.toLowerCase().includes(q) || a.matricula.includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [asesorados, busqueda, esVocal, carreraVocal])

  if (!usuario) return null

  const contar = (conBaja: boolean) =>
    filtrados.filter((a) => tieneBajaPendiente(solicitudes, a.id) === conBaja).length

  return (
    <>
      <FilaTitulo
        titulo="Asesorados"
        subline={esVocal ? `Asesorados de ${carreraVocal}` : `${contar(false)} activos · ${contar(true)} con baja pendiente`}
        accion={<NuevoAsesorado carreras={carreras} carreraFija={esVocal ? carreraVocal : undefined} />}
      />
      <Card>
        <CardContent className="pt-4">
          <Tabs defaultValue="todos">
            <div className="flex items-end justify-between gap-4">
              <TabsList>
                <TabsTrigger value="todos">Todos {filtrados.length}</TabsTrigger>
                <TabsTrigger value="activos">Activos {contar(false)}</TabsTrigger>
                <TabsTrigger value="baja">Baja pendiente {contar(true)}</TabsTrigger>
              </TabsList>
              <div className="relative pb-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o matrícula"
                  className="h-8 w-64 pl-8"
                />
              </div>
            </div>
            {(['todos', 'activos', 'baja'] as const).map((valor) => (
              <TabsContent key={valor} value={valor}>
                {(() => {
                  const lista =
                    valor === 'todos' ? filtrados : filtrados.filter((a) => tieneBajaPendiente(solicitudes, a.id) === (valor === 'baja'))
                  if (lista.length === 0) {
                    return <Vacio>No hay asesorados en esta vista.</Vacio>
                  }
                  return (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Nombre</TableHead>
                          <TableHead>Matrícula</TableHead>
                          <TableHead>Carrera</TableHead>
                          <TableHead>Sínodo</TableHead>
                          <TableHead className="text-right">Revisiones</TableHead>
                          <TableHead>Estado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lista.map((a) => {
                          const sinodo = a.asignaciones
                            .map((x) => {
                              const asesor = users.find((u) => u.id === x.asesorId)
                              return asesor ? `${asesor.nombre} (${etiquetaPuesto(x.puesto)})` : null
                            })
                            .filter(Boolean)
                            .join(' · ')
                          const n = revisiones.filter((r) => r.asesoradoId === a.id).length
                          return (
                            <TableRow key={a.id} className="cursor-pointer" onClick={() => nav(`${baseRuta}/asesorados/${a.id}`)}>
                              <TableCell className="max-w-52 truncate font-medium text-primary">{a.nombre}</TableCell>
                              <TableCell className="num text-muted-foreground">{a.matricula}</TableCell>
                              <TableCell className="max-w-44 truncate text-muted-foreground">{a.carrera}</TableCell>
                              <TableCell className="max-w-56 truncate text-muted-foreground">{sinodo || 'Sin asignar'}</TableCell>
                              <TableCell className="num text-right">{n}</TableCell>
                              <TableCell>
                                <EstadoPill tipo="asesorado" bajaPendiente={tieneBajaPendiente(solicitudes, a.id)} />
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  )
                })()}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </>
  )
}
