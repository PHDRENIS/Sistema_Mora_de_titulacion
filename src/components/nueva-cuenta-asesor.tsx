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
import { DialogoContrasena } from '@/components/dialogo-contrasena'
import { useDB } from '@/store/db'

const esquema = z.object({
  nombre: z.string().min(3, 'Escribe el nombre completo.'),
  correo: z.string().email('Escribe un correo válido.'),
})

type Formulario = z.infer<typeof esquema>

export function NuevaCuentaAsesor({ etiqueta = 'Nuevo asesor' }: { etiqueta?: string }) {
  const crearAsesor = useDB((s) => s.crearAsesor)
  const [abierto, setAbierto] = useState(false)
  const [creada, setCreada] = useState<{ nombre: string; correo: string; contrasena: string } | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '', correo: '' },
  })

  const guardar = (datos: Formulario) => {
    const user = crearAsesor(datos)
    toast.success('Asesor creado.')
    reset()
    setAbierto(false)
    setCreada({ nombre: user.nombre, correo: user.correo, contrasena: user.contrasena })
  }

  return (
    <>
      <Dialog open={abierto} onOpenChange={setAbierto}>
        <DialogTrigger asChild>
          <Button>
            <UserPlus />
            {etiqueta}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo asesor</DialogTitle>
            <DialogDescription>Se generará una contraseña aleatoria para su cuenta.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(guardar)} className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="nombre-asesor">Nombre</Label>
              <Input id="nombre-asesor" placeholder="Nombre completo" {...register('nombre')} />
              {errors.nombre ? <p className="text-xs text-bad-ink">{errors.nombre.message}</p> : null}
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Label htmlFor="correo-asesor">Correo</Label>
              <Input id="correo-asesor" type="email" placeholder="nombre@escuela.mx" {...register('correo')} />
              {errors.correo ? <p className="text-xs text-bad-ink">{errors.correo.message}</p> : null}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit">Crear asesor</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <DialogoContrasena
        abierto={creada !== null}
        onCerrar={() => setCreada(null)}
        nombre={creada?.nombre ?? ''}
        correo={creada?.correo ?? ''}
        contrasena={creada?.contrasena ?? ''}
      />
    </>
  )
}
