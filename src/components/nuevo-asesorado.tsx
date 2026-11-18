import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDB } from '@/store/db'

const esquema = z.object({
  nombre: z.string().min(3, 'Escribe el nombre completo.'),
  matricula: z.string().min(4, 'La matrícula tiene al menos 4 caracteres.'),
  correo: z.string().email('Escribe un correo válido.'),
  carrera: z.string().min(3, 'Escribe o elige la carrera.'),
})

type Formulario = z.infer<typeof esquema>

export function NuevoAsesorado({ carreras, carreraFija }: { carreras: string[]; carreraFija?: string }) {
  const crearAsesorado = useDB((s) => s.crearAsesorado)
  const [abierto, setAbierto] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '', matricula: '', correo: '', carrera: carreraFija ?? '' },
  })

  const guardar = async (datos: Formulario) => {
    const datosFinales: Formulario = carreraFija ? { ...datos, carrera: carreraFija } : datos
    const ok = await crearAsesorado({
      nombre: datosFinales.nombre,
      matricula: datosFinales.matricula,
      correo: datosFinales.correo,
      carrera: datosFinales.carrera,
    })
    if (!ok) return
    toast.success('Asesorado creado. Los vocales podrán asignar su sínodo desde Asignación.')
    reset({ nombre: '', matricula: '', correo: '', carrera: carreraFija ?? '' })
    setAbierto(false)
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger asChild>
        <Button onClick={() => setAbierto(true)}>
          <UserPlus />
          Nuevo asesorado
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo asesorado</DialogTitle>
          <DialogDescription>El expediente se crea sin sínodo; los vocales asignan Presidente, Vocal, Secretario y Suplente desde Asignación.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(guardar)} className="grid grid-cols-1 gap-4">
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="nombre-asesorado">Nombre</Label>
            <Input id="nombre-asesorado" placeholder="Nombre completo del alumno" {...register('nombre')} />
            {errors.nombre ? <p className="text-xs text-bad-ink">{errors.nombre.message}</p> : null}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="matricula">Matrícula</Label>
            <Input id="matricula" placeholder="2019…" className="num" {...register('matricula')} />
            {errors.matricula ? <p className="text-xs text-bad-ink">{errors.matricula.message}</p> : null}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="correo-asesorado">Correo</Label>
            <Input id="correo-asesorado" type="email" placeholder="nombre@alumno.mx" {...register('correo')} />
            {errors.correo ? <p className="text-xs text-bad-ink">{errors.correo.message}</p> : null}
          </div>
          <div className="grid grid-cols-1 gap-2">
            <Label htmlFor="carrera-asesorado">Carrera</Label>
            {carreraFija ? (
              <Input id="carrera-asesorado" value={carreraFija} disabled />
            ) : (
              <>
                <Input id="carrera-asesorado" list="carreras-lista" placeholder="Elige o escribe" {...register('carrera')} />
                <datalist id="carreras-lista">
                  {carreras.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
            {errors.carrera ? <p className="text-xs text-bad-ink">{errors.carrera.message}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
              Cancelar
            </Button>
            <Button type="submit">Crear asesorado</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
