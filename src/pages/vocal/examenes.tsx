import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FilaTitulo } from '@/components/fila-titulo'
import { Vacio } from '@/components/vacio'
import { CalendarioExamenes, LeyendaExamenes, type VistaSlot } from '@/components/calendario-examenes'
import { diaLegible, sumarMinutos, fechaCorta, horaLegible } from '@/lib/format'
import { useDB, useUsuarioActual, procesoAbierto, salaEtiqueta, etiquetaPuesto, type SlotExamen } from '@/store/db'

export default function Examenes() {
  const usuario = useUsuarioActual()
  const slots = useDB((s) => s.slots)
  const salas = useDB((s) => s.salas)
  const proceso = useDB((s) => s.proceso)
  const sinFecha = useDB((s) => s.examenesSinFecha)
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const asignarExamen = useDB((s) => s.asignarExamen)
  const liberarExamen = useDB((s) => s.liberarExamen)

  const [porAsignar, setPorAsignar] = useState<SlotExamen | null>(null)
  const [elegido, setElegido] = useState('')

  const enBorrador = proceso.estado === 'borrador'
  const abierta = procesoAbierto({ proceso })
  const programadaFutura = proceso.estado === 'guardado' && proceso.abreEn !== null && Date.now() < new Date(proceso.abreEn).getTime()

  const conDetalle = useMemo(() => new Set(asesorados.filter((a) => a.carrera === usuario?.carrera).map((a) => a.id)), [asesorados, usuario])

  const vistas: VistaSlot[] = useMemo(
    () =>
      slots.map((slot) => {
        if (!slot.asesoradoId) return { slot, modo: 'libre', onAsignar: abierta ? () => setPorAsignar(slot) : undefined }
        const asesorado = asesorados.find((a) => a.id === slot.asesoradoId)
        const vocal = users.find((u) => u.id === slot.asignadoPor)
        if (!asesorado || !conDetalle.has(asesorado.id)) return { slot, modo: 'ajeno' }
        const sala = salas.find((x) => x.id === slot.salaId)
        return {
          slot,
          modo: 'detalle',
          titulo: asesorado.nombre,
          subtitulo: [salaEtiqueta(sala), vocal?.nombre].filter(Boolean).join(' · '),
          onLiberar:
            abierta && slot.asignadoPor === usuario?.id
              ? async () => {
                  if (await liberarExamen(slot.id)) toast.success('Horario liberado; vuelve a estar disponible.')
                }
              : undefined,
        }
      }),
    [slots, asesorados, users, salas, conDetalle, usuario, abierta, liberarExamen],
  )

  const elegibles = useMemo(() => {
    if (!usuario) return []
    const ocupados = new Set(slots.filter((x) => x.asesoradoId).map((x) => x.asesoradoId))
    return asesorados.filter((a) => a.carrera === usuario.carrera && !ocupados.has(a.id))
  }, [asesorados, slots, usuario])

  const pendientes = useMemo(
    () =>
      sinFecha
        .filter((x) => {
          const a = asesorados.find((b) => b.id === x.asesoradoId)
          return a && a.carrera === usuario?.carrera
        })
        .map((x) => ({ ...x, asesorado: asesorados.find((b) => b.id === x.asesoradoId)! })),
    [sinFecha, asesorados, usuario],
  )

  if (!usuario) return null

  const asignar = async () => {
    if (!porAsignar || !elegido) return
    const r = await asignarExamen(porAsignar.id, elegido)
    if (!r.ok) {
      toast.error(r.error ?? 'No se pudo asignar.')
      return
    }
    const a = asesorados.find((x) => x.id === elegido)
    const sala = salas.find((x) => x.id === porAsignar.salaId)
    toast.success(`${a?.nombre ?? 'Asesorado'} asignado a las ${porAsignar.horaInicio} del ${diaLegible(porAsignar.fecha)} en ${salaEtiqueta(sala)}.`)
    setPorAsignar(null)
    setElegido('')
  }

  return (
    <>
      <FilaTitulo
        titulo="Exámenes profesionales"
        subline={`Proceso publicado por Coordinación con ${salas.length} ${salas.length === 1 ? 'sala' : 'salas'}. Asigna asesorados de ${usuario.carrera}; un horario ocupado se bloquea para todos.`}
      />
      {enBorrador ? (
        <div className="mb-4 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          Coordinación está preparando el proceso de inscripción. Aún no hay calendario disponible.
        </div>
      ) : !abierta ? (
        <div className="mb-4 rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          {programadaFutura
            ? `El calendario aún no abre. Podrás asignar a partir del ${fechaCorta(proceso.abreEn as string)} a las ${horaLegible(proceso.abreEn as string)}`
            : 'El proceso está cerrado por Coordinación. No es posible asignar ni liberar horarios.'}
        </div>
      ) : null}

      {pendientes.length > 0 ? (
        <Card className="mb-6">
          <CardContent className="pt-4">
            <p className="mb-1 flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="size-4 text-muted-foreground" />
              Exámenes sin fecha ({pendientes.length})
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              El proceso anterior se borró; reasigna estos asesorados cuando haya un nuevo proceso.
            </p>
            <div className="divide-y divide-rule">
              {pendientes.map((x) => (
                <div key={x.asesoradoId} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <p className="truncate text-sm font-medium">{x.asesorado.nombre}</p>
                  <p className="num shrink-0 text-xs text-muted-foreground">Sin fecha desde {fechaCorta(x.liberadoEn)}</p>
                </div>
              ))}
            </div>
            {!abierta ? <Vacio className="mt-2">Cuando Coordinación abra un nuevo proceso, asígnalos aquí.</Vacio> : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="mb-4">
        <LeyendaExamenes />
      </div>
      <CalendarioExamenes vistas={vistas} salas={salas} />

      <Dialog
        open={porAsignar !== null}
        onOpenChange={(v) => {
          if (!v) {
            setPorAsignar(null)
            setElegido('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar examen</DialogTitle>
            <DialogDescription>
              {porAsignar
                ? `${salaEtiqueta(salas.find((x) => x.id === porAsignar.salaId))} · ${diaLegible(porAsignar.fecha)} a las ${porAsignar.horaInicio}–${sumarMinutos(porAsignar.horaInicio, porAsignar.duracionMin)}. No se permite si un sinodal del asesorado ya tiene examen a esa hora.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label>Asesorado de {usuario.carrera}</Label>
            {elegibles.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tienes asesorados disponibles para asignar (todos ya tienen examen).</p>
            ) : (
              <Select value={elegido} onValueChange={setElegido}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige un asesorado" />
                </SelectTrigger>
                <SelectContent>
                  {elegibles.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.nombre} · {a.matricula}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {elegido
              ? (() => {
                  const a = asesorados.find((x) => x.id === elegido)
                  return a && a.asignaciones.length > 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Sínodo: {a.asignaciones.map((x) => `${users.find((u) => u.id === x.asesorId)?.nombre ?? x.asesorId} (${etiquetaPuesto(x.puesto)})`).join(' · ')}
                    </p>
                  ) : null
                })()
              : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPorAsignar(null)}>
              Cancelar
            </Button>
            <Button onClick={asignar} disabled={!elegido}>
              Asignar examen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
