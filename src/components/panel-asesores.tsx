import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DialogoContrasena } from '@/components/dialogo-contrasena'
import { FilaTitulo } from '@/components/fila-titulo'
import { Vacio } from '@/components/vacio'
import { NuevaCuentaAsesor } from '@/components/nueva-cuenta-asesor'
import { useDB } from '@/store/db'

export function PanelAsesores({ baseRuta }: { baseRuta: '/admin' | '/vocal' }) {
  const nav = useNavigate()
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const solicitudes = useDB((s) => s.solicitudes)
  const revisiones = useDB((s) => s.revisiones)
  const restablecerContrasena = useDB((s) => s.restablecerContrasena)
  const [busqueda, setBusqueda] = useState('')
  const [creada, setCreada] = useState<{ nombre: string; correo: string; contrasena: string } | null>(null)

  const restablecer = async (id: string) => {
    const user = await restablecerContrasena(id)
    if (!user) return
    toast.success('Contraseña restablecida.')
    setCreada({ nombre: user.nombre, correo: user.correo, contrasena: user.contrasena ?? '' })
  }

  const asesores = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return users
      .filter((u) => u.rol === 'asesor')
      .filter((u) => !q || u.nombre.toLowerCase().includes(q) || u.correo.toLowerCase().includes(q))
  }, [users, busqueda])

  return (
    <>
      <FilaTitulo
        titulo="Asesores"
        subline={`${users.filter((u) => u.rol === 'asesor').length} asesores con cuentas activas`}
        accion={<NuevaCuentaAsesor />}
      />
      <Card>
        <CardContent className="pt-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">{asesores.length} asesores</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar por nombre o correo"
                className="h-8 w-64 pl-8"
              />
            </div>
          </div>
          {asesores.length === 0 ? (
            <Vacio>Sin resultados para “{busqueda}”.</Vacio>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead className="text-right">Asesorados</TableHead>
                  <TableHead className="text-right">Revisiones por revisar</TableHead>
                  {baseRuta === '/admin' ? <TableHead className="w-10" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {asesores.map((a) => {
                  const mios = asesorados.filter((x) => x.asignaciones.some((y) => y.asesorId === a.id))
                  const pend = revisiones.filter(
                    (r) => r.estado === 'pendiente' && mios.some((m) => m.id === r.asesoradoId) && !solicitudes.some((s) => s.asesoradoId === r.asesoradoId && s.estado === 'pendiente'),
                  ).length
                  return (
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => nav(`${baseRuta}/asesores/${a.id}`)}>
                      <TableCell className="max-w-56 truncate font-medium text-primary">{a.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{a.correo}</TableCell>
                      <TableCell className="num text-right">{mios.length}</TableCell>
                      <TableCell className="num text-right">{pend}</TableCell>
                      {baseRuta === '/admin' ? (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            title={`Restablecer la contraseña de ${a.nombre}`}
                            aria-label="Restablecer contraseña"
                            onClick={(e) => {
                              e.stopPropagation()
                              restablecer(a.id)
                            }}
                          >
                            <KeyRound />
                          </Button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DialogoContrasena
        abierto={creada !== null}
        onCerrar={() => setCreada(null)}
        correo={creada?.correo ?? ''}
        contrasena={creada?.contrasena ?? ''}
        titulo="Contraseña restablecida"
      />
    </>
  )
}
