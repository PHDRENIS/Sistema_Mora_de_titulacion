import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarPlus, LockOpen, Lock, Trash2, Plus, Pencil, Check, X, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { FilaTitulo } from '@/components/fila-titulo'
import { CalendarioExamenes, LeyendaExamenes, type VistaSlot } from '@/components/calendario-examenes'
import { hoyISO, fechaCorta, horaLegible } from '@/lib/format'
import { useDB, useUsuarioActual, procesoAbierto, salaEtiqueta } from '@/store/db'

export default function Examenes() {
  const usuario = useUsuarioActual()
  const slots = useDB((s) => s.slots)
  const salas = useDB((s) => s.salas)
  const proceso = useDB((s) => s.proceso)
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const generarSlots = useDB((s) => s.generarSlots)
  const eliminarSlot = useDB((s) => s.eliminarSlot)
  const liberarExamen = useDB((s) => s.liberarExamen)
  const crearSala = useDB((s) => s.crearSala)
  const renombrarSala = useDB((s) => s.renombrarSala)
  const eliminarSala = useDB((s) => s.eliminarSala)
  const guardarProceso = useDB((s) => s.guardarProceso)
  const abrirProceso = useDB((s) => s.abrirProceso)
  const cerrarProceso = useDB((s) => s.cerrarProceso)
  const borrarProceso = useDB((s) => s.borrarProceso)

  const [fechaInicio, setFechaInicio] = useState(hoyISO())
  const [fechaFin, setFechaFin] = useState(hoyISO())
  const [nuevaSala, setNuevaSala] = useState('')
  const [editandoSala, setEditandoSala] = useState<string | null>(null)
  const [nombreSala, setNombreSala] = useState('')
  const [salaActiva, setSalaActiva] = useState<string | null>(null)
  const [apertura, setApertura] = useState('')
  const [porGuardar, setPorGuardar] = useState(false)
  const [porBorrar, setPorBorrar] = useState(false)

  const enBorrador = proceso.estado === 'borrador'
  const abierta = procesoAbierto({ proceso })

  const asignados = useMemo(() => slots.filter((x) => x.asesoradoId).length, [slots])

  const vistas: VistaSlot[] = useMemo(
    () =>
      slots.map((slot) => {
        if (!slot.asesoradoId) {
          return {
            slot,
            modo: 'libre',
            onEliminar: enBorrador
              ? () => {
                  if (eliminarSlot(slot.id)) toast.success('Horario eliminado.')
                }
              : undefined,
          }
        }
        const asesorado = asesorados.find((a) => a.id === slot.asesoradoId)
        const vocal = users.find((u) => u.id === slot.asignadoPor)
        const sala = salas.find((x) => x.id === slot.salaId)
        return {
          slot,
          modo: 'detalle',
          titulo: asesorado?.nombre ?? 'Asesorado dado de baja',
          subtitulo: [salaEtiqueta(sala), vocal?.nombre].filter(Boolean).join(' · '),
          onLiberar: () => {
            if (liberarExamen(slot.id, usuario?.id ?? '')) toast.success('Horario liberado; vuelve a estar disponible.')
          },
        }
      }),
    [slots, asesorados, users, salas, usuario, enBorrador, eliminarSlot, liberarExamen],
  )

  if (!usuario) return null

  const generar = () => {
    if (!enBorrador) return toast.error('El proceso está guardado; bórralo para definir otro calendario.')
    if (salas.length === 0) return toast.error('Crea al menos una sala antes de generar horarios.')
    if (!fechaInicio || !fechaFin) return toast.error('Elige las fechas de inicio y fin del proceso.')
    if (fechaInicio > fechaFin) return toast.error('La fecha de inicio debe ser anterior o igual a la de fin.')
    const dias = Math.round((new Date(fechaFin).getTime() - new Date(fechaInicio).getTime()) / 86400000) + 1
    if (dias > 92) return toast.error('El rango no puede exceder 92 días.')
    const creados = generarSlots(fechaInicio, fechaFin)
    if (creados === 0) toast.info('No se creó ningún horario nuevo; ya existían para esas fechas y salas.')
    else toast.success(`Se generaron ${creados} horarios (${creados / salas.length} por sala).`)
  }

  const agregarSala = () => {
    if (!nuevaSala.trim()) return toast.error('Escribe el nombre de la sala.')
    const antes = new Set(salas.map((x) => x.id))
    crearSala(nuevaSala)
    const nueva = useDB.getState().salas.find((x) => !antes.has(x.id))
    if (!nueva) return toast.error('Ya existe una sala con ese nombre.')
    setNuevaSala('')
    setSalaActiva(nueva.id)
    toast.success('Sala agregada.')
  }

  const guardarNombreSala = () => {
    if (!editandoSala) return
    renombrarSala(editandoSala, nombreSala)
    setEditandoSala(null)
    setNombreSala('')
  }

  const abrirDialogoGuardar = () => {
    if (slots.length === 0) return toast.error('Genera horarios antes de guardar el proceso.')
    if (salas.length === 0) return toast.error('Crea al menos una sala.')
    setApertura('')
    setPorGuardar(true)
  }

  const confirmarGuardar = () => {
    if (!apertura) return toast.error('Elige la fecha y hora en que abre la asignación.')
    if (new Date(apertura).getTime() <= Date.now()) return toast.error('La apertura debe ser en el futuro.')
    guardarProceso(new Date(apertura).toISOString())
    setPorGuardar(false)
    toast.success('Proceso guardado. Los vocales ya pueden ver el calendario y la fecha de apertura.')
  }

  const estadoEtiqueta = proceso.estado === 'borrador' ? 'Borrador' : abierta ? 'Abierto' : proceso.estado === 'cerrado' ? 'Cerrado' : 'Guardado'
  const estadoVariant = abierta ? 'ok' : proceso.estado === 'borrador' ? 'neutral' : proceso.estado === 'cerrado' ? 'bad' : 'warn'
  const estadoDetalle = proceso.estado === 'borrador'
    ? 'Los vocales no ven nada todavía. Crea salas, genera horarios y guarda el proceso.'
    : abierta
      ? 'Los vocales pueden asignar asesorados.'
      : proceso.estado === 'cerrado'
        ? 'Cerrado por Coordinación; los vocales no pueden asignar ni liberar.'
        : `La asignación abre el ${fechaCorta(proceso.abreEn as string)} a las ${horaLegible(proceso.abreEn as string)}.`

  return (
    <>
      <FilaTitulo
        titulo="Exámenes profesionales"
        subline="Crea las salas, genera el calendario y guarda el proceso de inscripción para que los vocales lo vean."
      />
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2.5">
            <Badge variant={estadoVariant}>{estadoEtiqueta}</Badge>
            <p className="min-w-0 text-sm text-muted-foreground">{estadoDetalle}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {enBorrador ? (
              <Button onClick={abrirDialogoGuardar}>
                <Save />
                Guardar proceso de inscripción
              </Button>
            ) : abierta ? (
              <Button
                variant="outline"
                onClick={() => {
                  cerrarProceso()
                  toast.success('Proceso cerrado. Los vocales ya no pueden asignar ni liberar.')
                }}
              >
                <Lock />
                Cerrar de golpe
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  abrirProceso()
                  toast.success('Proceso abierto. Los vocales ya pueden asignar.')
                }}
              >
                <LockOpen />
                Abrir ahora
              </Button>
            )}
            <Button variant="ghost" className="text-bad-ink hover:bg-bad-bg" disabled={salas.length === 0 && slots.length === 0} onClick={() => setPorBorrar(true)}>
              <Trash2 />
              Borrar proceso
            </Button>
          </div>
        </CardContent>
      </Card>

      {enBorrador ? (
        <>
          <Card className="mb-6">
            <CardContent className="pt-4">
              <p className="mb-3 text-sm font-medium">Salas del proceso ({salas.length})</p>
              <div className="mb-4 flex items-center gap-2">
                <Input
                  value={nuevaSala}
                  onChange={(e) => setNuevaSala(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') agregarSala()
                  }}
                  placeholder="Nombre de la sala, p. ej. Auditorio A"
                  className="max-w-xs"
                />
                <Button variant="outline" onClick={agregarSala}>
                  <Plus />
                  Agregar sala
                </Button>
              </div>
              {salas.length === 0 ? (
                <p className="rounded-lg border border-dashed border-input px-4 py-3 text-sm text-muted-foreground">
                  Sin salas. Agrega al menos una; los horarios se generan para todas por igual.
                </p>
              ) : (
                <div className="grid gap-1.5">
                  {salas.map((sala) => (
                    <div key={sala.id} className="flex items-center justify-between gap-3 rounded-lg bg-field px-3 py-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Badge variant="neutral">Sala {sala.numero}</Badge>
                        {editandoSala === sala.id ? (
                          <Input
                            value={nombreSala}
                            onChange={(e) => setNombreSala(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') guardarNombreSala()
                              if (e.key === 'Escape') setEditandoSala(null)
                            }}
                            className="h-7 max-w-56"
                            autoFocus
                          />
                        ) : (
                          <p className="truncate text-sm font-medium">{sala.nombre}</p>
                        )}
                      </div>
                      <span className="flex shrink-0 items-center gap-1">
                        {editandoSala === sala.id ? (
                          <>
                            <Button variant="ghost" size="icon" className="size-7" onClick={guardarNombreSala}>
                              <Check />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditandoSala(null)}>
                              <X />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => {
                                setEditandoSala(sala.id)
                                setNombreSala(sala.nombre)
                              }}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-bad-ink hover:bg-bad-bg"
                              onClick={() => {
                                if (eliminarSala(sala.id)) toast.success('Sala eliminada.')
                                else toast.error('No se puede eliminar: el proceso ya está guardado o la sala tiene horarios.')
                              }}
                            >
                              <Trash2 />
                            </Button>
                          </>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 items-end gap-3 lg:grid-cols-[1fr_1fr_auto]">
                <div className="grid gap-1.5">
                  <Label htmlFor="fecha-inicio-examen">Proceso: inicio</Label>
                  <Input id="fecha-inicio-examen" type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="fecha-fin-examen">Proceso: fin</Label>
                  <Input id="fecha-fin-examen" type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
                </div>
                <Button onClick={generar}>
                  <CalendarPlus />
                  Generar horarios
                </Button>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Turnos fijos: entre semana, matutino 07:00–13:00 (horarios de 07:00, 09:00 y 11:00) y vespertino 14:00–20:00 (14:00, 16:00 y 18:00);
                sábados 08:00–14:00 (08:00, 10:00 y 12:00). Cada examen dura 2 horas; los domingos no se generan horarios.
                {salas.length > 0
                  ? ` Cada fecha, hora y turno se crea en las ${salas.length} ${salas.length === 1 ? 'sala' : 'salas'} con el mismo horario.`
                  : null}
              </p>
            </CardContent>
          </Card>
        </>
      ) : null}

      <div className="mb-4">
        <LeyendaExamenes />
      </div>
      <CalendarioExamenes vistas={vistas} salas={salas} salaActiva={salaActiva ?? undefined} onSalaActiva={setSalaActiva} />

      <Dialog open={porGuardar} onOpenChange={setPorGuardar}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar proceso de inscripción</DialogTitle>
            <DialogDescription>
              Publica el calendario con {salas.length} {salas.length === 1 ? 'sala' : 'salas'} y {slots.length} horarios. Elige cuándo podrán los vocales empezar a asignar.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="apertura-proceso">Apertura de asignación</Label>
            <Input id="apertura-proceso" type="datetime-local" value={apertura} onChange={(e) => setApertura(e.target.value)} />
            <p className="text-xs text-muted-foreground">
              Hasta esa fecha y hora los vocales verán el calendario, pero no podrán asignar. Una vez guardado, el proceso queda bloqueado: para cambiarlo hay que borrarlo.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPorGuardar(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarGuardar}>Guardar proceso</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={porBorrar} onOpenChange={setPorBorrar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Borrar el proceso completo?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminan salas y horarios{asignados > 0 ? `, incluidos ${asignados} exámenes ya asignados que quedarán sin fecha` : ''}. Los vocales afectados recibirán una notificación para reasignarlos cuando publiques un nuevo proceso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-bad-ink text-white hover:bg-bad-ink/90"
              onClick={() => {
                borrarProceso()
                setPorBorrar(false)
                toast.success('Proceso borrado. Los exámenes asignados quedaron sin fecha y los vocales fueron notificados.')
              }}
            >
              Borrar proceso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
