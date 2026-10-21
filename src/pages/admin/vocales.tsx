import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { DialogoContrasena } from '@/components/dialogo-contrasena'
import { FilaTitulo } from '@/components/fila-titulo'
import { Vacio } from '@/components/vacio'
import { useDB, useUsuarioActual } from '@/store/db'

const esquema = z.object({
  nombre: z.string().min(3, 'Escribe el nombre completo.'),
  correo: z.string().email('Escribe un correo válido.'),
  carrera: z.string().min(3, 'Escribe la carrera que coordinará.'),
})

type Formulario = z.infer<typeof esquema>

export default function Vocales() {
  const usuario = useUsuarioActual()
  const users = useDB((s) => s.users)
  const asesorados = useDB((s) => s.asesorados)
  const crearVocal = useDB((s) => s.crearVocal)
  const borrarVocal = useDB((s) => s.borrarVocal)
  const [abierto, setAbierto] = useState(false)
  const [porBorrar, setPorBorrar] = useState<string | null>(null)
  const [creada, setCreada] = useState<{ nombre: string; correo: string; contrasena: string } | null>(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm<Formulario>({
    resolver: zodResolver(esquema),
    defaultValues: { nombre: '', correo: '', carrera: '' },
  })

  const vocales = useMemo(() => users.filter((u) => u.rol === 'vocal'), [users])

  if (!usuario) return null

  const guardar = (datos: Formulario) => {
    const user = crearVocal(datos)
    toast.success('Vocal creado.')
    reset({ nombre: '', correo: '', carrera: '' })
    setAbierto(false)
    setCreada({ nombre: user.nombre, correo: user.correo, contrasena: user.contrasena })
  }

  const confirmarBorrado = () => {
    if (!porBorrar) return
    borrarVocal(porBorrar)
    toast.success('Vocal eliminado.')
    setPorBorrar(null)
  }

  const porBorrarUser = users.find((u) => u.id === porBorrar)

  return (
    <>
      <FilaTitulo
        titulo="Vocales"
        subline={`${vocales.length} vocales · uno por carrera`}
        accion={
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus />
                Nuevo vocal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo vocal</DialogTitle>
                <DialogDescription>
                  Le asignas su carrera: podrá dar de alta asesorados y asignar los de esa carrera. La contraseña se genera automáticamente.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(guardar)} className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="nombre-vocal">Nombre</Label>
                  <Input id="nombre-vocal" placeholder="Nombre completo" {...register('nombre')} />
                  {errors.nombre ? <p className="text-xs text-bad-ink">{errors.nombre.message}</p> : null}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="correo-vocal">Correo</Label>
                  <Input id="correo-vocal" type="email" placeholder="nombre@escuela.mx" {...register('correo')} />
                  {errors.correo ? <p className="text-xs text-bad-ink">{errors.correo.message}</p> : null}
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <Label htmlFor="carrera-vocal">Carrera</Label>
                  <Input id="carrera-vocal" placeholder="Por ejemplo, Ingeniería en Sistemas" {...register('carrera')} />
                  {errors.carrera ? <p className="text-xs text-bad-ink">{errors.carrera.message}</p> : null}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAbierto(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">Crear vocal</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      <Card>
        <CardContent className="pt-4">
          <p className="mb-3 text-sm text-muted-foreground">{vocales.length} vocales</p>
          {vocales.length === 0 ? (
            <Vacio>Sin vocales todavía. Crea el primero con su carrera.</Vacio>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Carrera</TableHead>
                  <TableHead className="text-right">Asesorados de su carrera</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {vocales.map((v) => {
                  const cuenta = asesorados.filter((a) => a.carrera === v.carrera).length
                  return (
                    <TableRow key={v.id}>
                      <TableCell className="max-w-56 truncate font-medium">{v.nombre}</TableCell>
                      <TableCell className="text-muted-foreground">{v.correo}</TableCell>
                      <TableCell className="max-w-48 truncate text-muted-foreground">{v.carrera}</TableCell>
                      <TableCell className="num text-right">{cuenta}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="text-bad-ink hover:bg-bad-bg" onClick={() => setPorBorrar(v.id)}>
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={porBorrar !== null} onOpenChange={(v) => (v ? undefined : setPorBorrar(null))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {porBorrarUser?.nombre}?</AlertDialogTitle>
            <AlertDialogDescription>
              Su cuenta dejará de existir y ya no podrá coordinar {porBorrarUser?.carrera}. Los asesorados no se tocan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-bad-ink text-white hover:bg-bad-ink/90" onClick={confirmarBorrado}>
              Eliminar vocal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
