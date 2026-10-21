import { Copy, MailCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export function DialogoContrasena({
  abierto,
  onCerrar,
  nombre,
  correo,
  contrasena,
}: {
  abierto: boolean
  onCerrar: () => void
  nombre: string
  correo: string
  contrasena: string
}) {
  const asunto = encodeURIComponent('Acceso al sistema de titulación')
  const cuerpo = encodeURIComponent(
    `Hola,\n\nTu cuenta para el Sistema Mora de titulación ya está lista.\n\nCorreo: ${correo}\nContraseña: ${contrasena}\n\nEntra en el sistema y guarda esta contraseña.\n\nCoordinación de Titulación`,
  )

  return (
    <Dialog open={abierto} onOpenChange={(v) => (v ? undefined : onCerrar())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cuenta creada</DialogTitle>
          <DialogDescription>
            La contraseña de {nombre} se generó automáticamente. Solo se muestra esta vez: cópiala o envíala por correo antes de cerrar.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-field px-4 py-3">
          <p className="text-xs text-muted-foreground">Correo</p>
          <p className="text-sm">{correo}</p>
          <p className="mt-2 text-xs text-muted-foreground">Contraseña</p>
          <p className="num text-lg font-semibold tracking-[0.08em]">{contrasena}</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onCerrar()}>
            Listo
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard
                .writeText(contrasena)
                .then(() => toast.success('Contraseña copiada al portapapeles.'))
                .catch(() => toast.error('No se pudo copiar la contraseña.'))
            }}
          >
            <Copy />
            Copiar
          </Button>
          <Button asChild>
            <a href={`mailto:${correo}?subject=${asunto}&body=${cuerpo}`}>
              <MailCheck />
              Enviar por correo
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
