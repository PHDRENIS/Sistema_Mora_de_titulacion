import type { ReactNode } from 'react'
import { useState } from 'react'
import { Lock, LockOpen, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Vacio } from '@/components/vacio'
import { diaLegible, sumarMinutos } from '@/lib/format'
import { turnoDeSlot } from '@/store/db'
import type { SalaExamen, SlotExamen } from '@/store/db'

export interface VistaSlot {
  slot: SlotExamen
  modo: 'libre' | 'detalle' | 'ajeno'
  titulo?: string
  subtitulo?: string
  onAsignar?: () => void
  onLiberar?: () => void
  onEliminar?: () => void
}

export function CalendarioExamenes({
  vistas,
  salas,
  salaActiva: salaActivaControlada,
  onSalaActiva,
}: {
  vistas: VistaSlot[]
  salas: SalaExamen[]
  salaActiva?: string
  onSalaActiva?: (salaId: string) => void
}) {
  const [interna, setInterna] = useState(salas[0]?.id ?? '')
  const salaActiva = salaActivaControlada && salas.some((x) => x.id === salaActivaControlada) ? salaActivaControlada : interna
  const cambiar = (id: string) => {
    if (onSalaActiva) onSalaActiva(id)
    else setInterna(id)
  }

  if (salas.length === 0) {
    return <Vacio>No hay salas definidas todavía.</Vacio>
  }

  return (
    <Tabs value={salaActiva} onValueChange={cambiar}>
      <TabsList className="flex-wrap">
        {salas.map((sala) => (
          <TabsTrigger key={sala.id} value={sala.id}>
            Sala {sala.numero} · {sala.nombre}
          </TabsTrigger>
        ))}
      </TabsList>
      {salas.map((sala) => (
        <TabsContent
          key={sala.id}
          value={sala.id}
          className="duration-300 data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-4"
        >
          <CalendarioSala vistas={vistas.filter((v) => v.slot.salaId === sala.id)} />
        </TabsContent>
      ))}
    </Tabs>
  )
}

function CalendarioSala({ vistas }: { vistas: VistaSlot[] }) {
  const fechas = [...new Set(vistas.map((v) => v.slot.fecha))].sort((a, b) => a.localeCompare(b))

  if (fechas.length === 0) {
    return <Vacio>Esta sala no tiene horarios en el proceso.</Vacio>
  }

  return (
    <div className="grid gap-4">
      {fechas.map((fecha) => {
        const delDia = vistas
          .filter((v) => v.slot.fecha === fecha)
          .sort((a, b) => a.slot.horaInicio.localeCompare(b.slot.horaInicio))
        const libres = delDia.filter((v) => v.modo === 'libre').length
        const turnos = [...new Set(delDia.map((v) => turnoDeSlot(v.slot.fecha, v.slot.horaInicio)))]
        return (
          <Card key={fecha}>
            <CardHeader>
              <CardTitle>{diaLegible(fecha)}</CardTitle>
              <CardDescription>
                {turnos.join(' · ')} · {delDia.length} {delDia.length === 1 ? 'horario' : 'horarios'} · {libres}{' '}
                {libres === 1 ? 'disponible' : 'disponibles'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{delDia.map((v) => <CeldaSlot key={v.slot.id} vista={v} />)}</CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function CeldaSlot({ vista }: { vista: VistaSlot }) {
  const { slot, modo } = vista
  const rango = `${slot.horaInicio}–${sumarMinutos(slot.horaInicio, slot.duracionMin)}`

  if (modo === 'libre') {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-input px-3 py-2.5">
        <div className="min-w-0">
          <p className="num text-sm font-medium">{rango}</p>
          <p className="text-xs text-muted-foreground">Disponible</p>
        </div>
        <span className="flex shrink-0 items-center gap-1">
          {vista.onEliminar ? (
            <button
              type="button"
              onClick={vista.onEliminar}
              title="Eliminar horario"
              className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-bad-bg hover:text-bad-ink outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
          {vista.onAsignar ? (
            <button
              type="button"
              onClick={vista.onAsignar}
              title="Asignar asesorado"
              className="grid size-7 place-items-center rounded-md text-primary transition-colors hover:bg-ok-bg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </span>
      </div>
    )
  }

  if (modo === 'ajeno') {
    return (
      <div className="flex items-center gap-2.5 rounded-lg bg-secondary/60 px-3 py-2.5 text-muted-foreground">
        <Lock className="size-4 shrink-0" />
        <div className="min-w-0">
          <p className="num text-sm font-medium">{rango}</p>
          <p className="text-xs">Ocupado</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-ok-bg px-3 py-2.5 text-ok-ink">
      <div className="min-w-0">
        <p className="num text-sm font-medium">{rango}</p>
        <p className="truncate text-xs font-medium">{vista.titulo}</p>
        {vista.subtitulo ? <p className="truncate text-xs opacity-80">{vista.subtitulo}</p> : null}
      </div>
      {vista.onLiberar ? (
        <button
          type="button"
          onClick={vista.onLiberar}
          title="Liberar horario"
          className="grid size-7 shrink-0 place-items-center rounded-md transition-colors hover:bg-ok-ink/10 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40"
        >
          <LockOpen className="size-4" />
          <span className="sr-only">Liberar horario</span>
        </button>
      ) : undefined}
    </div>
  )
}

export function LeyendaExamenes(): ReactNode {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm border border-dashed border-input" /> Disponible
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-ok-bg" /> Ocupado (tu carrera)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm bg-secondary/60" /> Ocupado (otra carrera)
      </span>
    </div>
  )
}
