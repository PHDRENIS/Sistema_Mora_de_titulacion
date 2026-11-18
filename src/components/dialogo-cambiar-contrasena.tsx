import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDB } from '@/store/db'

const esquema = z
  .object({
    nueva: z.string().min(1, 'Escribe la nueva contraseña.'),
    confirmacion: z.string().min(1, 'Confirma la nueva contraseña.'),
  })
  .refine((datos) => datos.nueva === datos.confirmacion, {
    message: 'Las contraseñas no coinciden.',
    path: ['confirmacion'],
  })

type Formulario = z.infer<typeof esquema>

export function DialogoCambiarContrasena({ abierto, onCerrar }: { abierto: boolean; onCerrar: () => void }) {
  const cambiarContrasena = useDB((s) => s.cambiarContrasena)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { nueva: '', confirmacion: '' } })

  const guardar = async (datos: Formulario) => {
    try {
      await cambiarContrasena(datos.nueva)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cambiar la contraseña.')
      return
    }
    toast.success('Contraseña actualizada.')
    reset({ nueva: '', confirmacion: '' })
    onCerrar()
  }

  return (
    <Dialog open={abierto} onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cambiar contraseña</DialogTitle>
          <DialogDescription>Escribe tu nueva contraseña y confírmala; deben coincidir para aplicar el cambio.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(guardar)} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="nueva-contrasena">Nueva contraseña</Label>
            <Input id="nueva-contrasena" type="password" placeholder="Tu nueva contraseña" {...register('nueva')} />
            {errors.nueva ? <p className="text-[13px] text-bad-ink">{errors.nueva.message}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirmar-contrasena">Confirmación</Label>
            <Input id="confirmar-contrasena" type="password" placeholder="Repite la contraseña" {...register('confirmacion')} />
            {errors.confirmacion ? <p className="text-[13px] text-bad-ink">{errors.confirmacion.message}</p> : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCerrar}>
              Cancelar
            </Button>
            <Button type="submit">Guardar contraseña</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
