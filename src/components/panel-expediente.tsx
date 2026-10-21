import { useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileUp, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/lib/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { EstadoPill } from '@/components/estado-pill'
import { Folio, ListaFolios } from '@/components/folio'
import { FilaTitulo } from '@/components/fila-titulo'
import { PozoDatos } from '@/components/pozo-datos'
import { Vacio } from '@/components/vacio'
import { Volver } from '@/components/volver'
import { fechaCorta, tamanoLegible } from '@/lib/format'
import { useDB, useUsuarioActual, etiquetaPuesto } from '@/store/db'

const OPCIONES: { valor: 'aceptada' | 'con_observaciones' | 'rechazada'; etiqueta: string }[] = [
  { valor: 'aceptada', etiqueta: 'Aceptada' },
  { valor: 'con_observaciones', etiqueta: 'Con observaciones' },
  { valor: 'rechazada', etiqueta: 'Rechazada' },
]

const EXTENSIONES = ['doc', 'docx', 'pdf']
const MAX_BYTES = 10 * 1024 * 1024

export function PanelExpediente({ baseRuta, puedeRevisar, esAsesor }: { baseRuta: string; puedeRevisar: boolean; esAsesor: boolean }) {
  const { id } = useParams()
  const usuario = useUsuarioActual()
  const asesorado = useDB((s) => s.asesorados.find((a) => a.id === id))
  const users = useDB((s) => s.users)
  const revisionesTodas = useDB((s) => s.revisiones)
  const revisiones = useMemo(
    () => revisionesTodas.filter((r) => r.asesoradoId === id).sort((a, b) => b.numero - a.numero),
    [revisionesTodas, id],
  )
  const solicitudPendiente = useDB((s) => s.solicitudes.find((x) => x.asesoradoId === id && x.estado === 'pendiente'))
  const agregarRevision = useDB((s) => s.agregarRevision)
  const solicitarBaja = useDB((s) => s.solicitarBaja)
  const revisarRevision = useDB((s) => s.revisarRevision)

  const [dialogoRevision, setDialogoRevision] = useState(false)
  const [dialogoBaja, setDialogoBaja] = useState(false)
  const [revisada, setRevisada] = useState<string | null>(null)
  const [estado, setEstado] = useState<'aceptada' | 'con_observaciones' | 'rechazada'>('aceptada')
  const [nota, setNota] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [archivo, setArchivo] = useState<File | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const inputArchivo = useRef<HTMLInputElement>(null)

  if (!usuario) return null

  if (!asesorado) {
    return (
      <>
        <Volver />
        <Vacio>No encontramos este asesorado.</Vacio>
      </>
    )
  }

  const elegirArchivo = (f: File | null) => {
    if (!f) return
    const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
    if (!EXTENSIONES.includes(ext)) {
      toast.error('Solo se aceptan documentos Word (.doc, .docx) o PDF.')
      setArchivo(null)
      return
    }
    if (f.size > MAX_BYTES) {
      toast.error('El archivo pesa más de 10 MB.')
      setArchivo(null)
      return
    }
    setArchivo(f)
  }

  const subir = async () => {
    if (descripcion.trim().length < 10) {
      toast.error('Describe la revisión en al menos 10 caracteres.')
      return
    }
    if (!archivo) {
      toast.error('Selecciona un documento Word o PDF.')
      return
    }
    setSubiendo(true)
    try {
      await agregarRevision(asesorado.id, descripcion, archivo)
      toast.success('Revisión enviada. Queda pendiente del veredicto.')
      setDialogoRevision(false)
      setDescripcion('')
      setArchivo(null)
    } catch {
      toast.error('No se pudo guardar el archivo.')
    } finally {
      setSubiendo(false)
    }
  }

  const abrirRevision = (revisionId: string) => {
    const rev = revisiones.find((r) => r.id === revisionId)
    setRevisada(revisionId)
    setEstado(rev && rev.estado !== 'pendiente' ? rev.estado : 'aceptada')
    setNota(rev?.nota ?? '')
  }

  const guardarVeredicto = () => {
    if (!revisada) return
    if (estado !== 'aceptada' && nota.trim().length < 5) {
      toast.error('Escribe una nota de al menos 5 caracteres para justificar el veredicto.')
      return
    }
    revisarRevision(revisada, estado, nota, usuario.id)
    toast.success('Revisión actualizada. El asesor recibirá el aviso con tu nota.')
    setRevisada(null)
  }

  return (
    <>
      <Volver />
      <FilaTitulo
        titulo={asesorado.nombre}
        pill={<EstadoPill tipo="asesorado" bajaPendiente={!!solicitudPendiente} />}
        subline={`Matrícula ${asesorado.matricula} · ${asesorado.carrera}`}
        accion={
          esAsesor && !solicitudPendiente ? (
            <>
              <Button
                variant="outline"
                className="text-bad-ink hover:bg-bad-bg hover:text-bad-ink"
                onClick={() => setDialogoBaja(true)}
              >
                <Trash2 />
                Solicitar baja
              </Button>
              <Button onClick={() => setDialogoRevision(true)}>
                <FileUp />
                Agregar revisión
              </Button>
            </>
          ) : null
        }
      />
      {solicitudPendiente ? (
        <div className="mb-4 rounded-lg border border-warn-ink/30 bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          {esAsesor
            ? 'Tu solicitud de baja está pendiente. El administrador la aceptará o rechazará.'
            : puedeRevisar && usuario.rol === 'admin'
              ? 'Hay una solicitud de baja pendiente de tu decisión. '
              : 'Hay una solicitud de baja pendiente que resolverá el administrador. '}
          {puedeRevisar && usuario.rol === 'admin' ? (
            <Link to={`${baseRuta}/solicitudes`} className="font-medium underline underline-offset-4">
              Ir a solicitudes
            </Link>
          ) : null}
        </div>
      ) : null}
      <PozoDatos
        filas={[
          ...(asesorado.asignaciones.length
            ? asesorado.asignaciones.map((x) => {
                const asesor = users.find((u) => u.id === x.asesorId)
                return {
                  etiqueta: etiquetaPuesto(x.puesto),
                  valor: asesor ? (
                    <Link to={`${baseRuta}/asesores/${asesor.id}`} className="text-primary hover:underline underline-offset-4">
                      {asesor.nombre}
                    </Link>
                  ) : (
                    '—'
                  ),
                }
              })
            : [{ etiqueta: 'Sínodo', valor: 'Sin asignar' }]),
          { etiqueta: 'Correo', valor: asesorado.correo },
          { etiqueta: 'Matrícula', valor: <span className="num">{asesorado.matricula}</span> },
          { etiqueta: 'Carrera', valor: asesorado.carrera },
          { etiqueta: 'Alta', valor: <span className="num">{fechaCorta(asesorado.creadoEn)}</span> },
          { etiqueta: 'Revisiones', valor: <span className="num">{revisiones.length}</span> },
        ]}
      />
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Historial de revisiones</CardTitle>
          <CardDescription>
            {esAsesor
              ? 'Cada entrega queda como folio y no se puede editar. Las notas del administrador y el vocal aparecen debajo.'
              : 'Marca el veredicto y deja una nota: el asesor la verá en su expediente.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {revisiones.length === 0 ? (
            <Vacio>{esAsesor ? 'Sin revisiones todavía. Usa “Agregar revisión” para subir el primer avance.' : 'Sin revisiones todavía.'}</Vacio>
          ) : (
            <ListaFolios>
              {revisiones.map((r) => (
                <Folio
                  key={r.id}
                  revision={r}
                  accion={
                    puedeRevisar ? (
                      <Button size="sm" variant="outline" onClick={() => abrirRevision(r.id)}>
                        Revisar
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </ListaFolios>
          )}
        </CardContent>
      </Card>

      {esAsesor ? (
        <>
          <Dialog open={dialogoRevision} onOpenChange={(v) => (v ? undefined : setDialogoRevision(false))}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar revisión de {asesorado.nombre}</DialogTitle>
                <DialogDescription>Sube el documento de avance y describe de qué trata la revisión.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="descripcion">Descripción de la revisión</Label>
                  <Textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    placeholder="Qué contiene este avance, capítulos revisados, acuerdos de la asesoría…"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label>Documento</Label>
                  <input
                    ref={inputArchivo}
                    type="file"
                    accept=".doc,.docx,.pdf"
                    className="hidden"
                    onChange={(e) => elegirArchivo(e.target.files?.[0] ?? null)}
                  />
                  <button
                    type="button"
                    onClick={() => inputArchivo.current?.click()}
                    className="flex items-center gap-3 rounded-lg border border-dashed border-input bg-field px-4 py-3 text-left transition-colors hover:bg-secondary/50"
                  >
                    <FileUp className="size-5 shrink-0 text-muted-foreground" />
                    {archivo ? (
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{archivo.name}</span>
                        <span className="num block text-xs text-muted-foreground">{tamanoLegible(archivo.size)}</span>
                      </span>
                    ) : (
                      <span>
                        <span className="block text-sm font-medium">Word (.doc, .docx) o PDF</span>
                        <span className="block text-xs text-muted-foreground">Máximo 10 MB</span>
                      </span>
                    )}
                  </button>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogoRevision(false)}>
                  Cancelar
                </Button>
                <Button onClick={() => void subir()} disabled={subiendo}>
                  {subiendo ? 'Subiendo…' : 'Enviar revisión'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={dialogoBaja} onOpenChange={setDialogoBaja}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Solicitar la baja de {asesorado.nombre}?</AlertDialogTitle>
                <AlertDialogDescription>
                  El administrador recibirá la solicitud y decidirá. Si la rechaza, el asesorado sigue activo; si la acepta, se elimina junto con sus revisiones.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className={cn(buttonVariants({ variant: 'destructive' }), 'bg-card hover:bg-bad-bg')}
                  onClick={() => {
                    solicitarBaja(asesorado.id, usuario.id)
                    toast.success('Solicitud de baja enviada al administrador.')
                  }}
                >
                  Solicitar baja
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}

      {puedeRevisar ? (
        <Dialog open={revisada !== null} onOpenChange={(v) => (v ? undefined : setRevisada(null))}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revisar entrega</DialogTitle>
              <DialogDescription>Elige el veredicto de esta revisión y escribe una nota para el asesor.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 gap-4">
              <div className="grid grid-cols-1 gap-2">
                <Label>Veredicto</Label>
                <Select value={estado} onValueChange={(v) => setEstado(v as typeof estado)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPCIONES.map((o) => (
                      <SelectItem key={o.valor} value={o.valor}>
                        {o.etiqueta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-2">
                <Label htmlFor="nota">Nota para el asesor {estado !== 'aceptada' ? '(obligatoria)' : '(opcional)'}</Label>
                <Textarea id="nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Qué ajustar, qué estuvo bien, siguientes pasos…" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevisada(null)}>
                Cancelar
              </Button>
              <Button onClick={guardarVeredicto}>Guardar veredicto</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  )
}
