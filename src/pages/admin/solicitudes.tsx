import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EstadoPill } from '@/components/estado-pill'
import { FilaTitulo } from '@/components/fila-titulo'
import { SolicitudPendiente } from '@/components/solicitud-pendiente'
import { Vacio } from '@/components/vacio'
import { fechaCorta } from '@/lib/format'
import { useDB } from '@/store/db'

export default function Solicitudes() {
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const solicitudes = useDB((s) => s.solicitudes)

  const pendientes = solicitudes.filter((s) => s.estado === 'pendiente').sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  const historial = solicitudes.filter((s) => s.estado !== 'pendiente').sort((a, b) => (b.resueltoEn ?? '').localeCompare(a.resueltoEn ?? ''))
  const nombreDe = (id: string) => users.find((u) => u.id === id)?.nombre ?? 'Coordinación'

  return (
    <>
      <FilaTitulo titulo="Solicitudes" subline={`${pendientes.length} pendientes de respuesta`} />
      <Card>
        <CardHeader>
          <CardTitle>Pendientes</CardTitle>
          <CardDescription>Acepta para eliminar el asesorado con sus revisiones; rechaza para conservarlo. El asesor recibirá el resultado.</CardDescription>
        </CardHeader>
        <CardContent>
          {pendientes.length === 0 ? (
            <Vacio>No hay solicitudes pendientes.</Vacio>
          ) : (
            <div className="divide-y divide-rule">
              {pendientes.map((s) => (
                <SolicitudPendiente key={s.id} solicitud={s} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Historial</CardTitle>
          <CardDescription>Solicitudes ya resueltas.</CardDescription>
        </CardHeader>
        <CardContent>
          {historial.length === 0 ? (
            <Vacio>Aún no hay solicitudes resueltas.</Vacio>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Asesorado</TableHead>
                  <TableHead>Solicitada por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Resuelta por</TableHead>
                  <TableHead>Resultado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historial.map((s) => {
                  const asesorado = asesorados.find((a) => a.id === s.asesoradoId)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="max-w-44 truncate">
                        {asesorado ? (
                          <Link to={`/admin/asesorados/${asesorado.id}`} className="text-primary hover:underline underline-offset-4">
                            {asesorado.nombre}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">Eliminado</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-44 truncate text-muted-foreground">{nombreDe(s.solicitadoPor)}</TableCell>
                      <TableCell className="num text-muted-foreground">{fechaCorta(s.creadoEn)}</TableCell>
                      <TableCell className="max-w-44 truncate text-muted-foreground">{nombreDe(s.resueltoPor ?? '')}</TableCell>
                      <TableCell>
                        <EstadoPill estado={s.estado} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <div className="mt-3 flex justify-end">
            <Badge variant="outline">Solo el administrador resuelve las bajas</Badge>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
