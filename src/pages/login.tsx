import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rutaPorRol, useDB, useUsuarioActual } from '@/store/db'

const esquema = z.object({
  correo: z.string().min(3, 'Escribe tu usuario.'),
  contrasena: z.string().min(1, 'Escribe tu contraseña.'),
})

type Formulario = z.infer<typeof esquema>

export default function Login() {
  const usuarioActual = useUsuarioActual()
  const iniciarSesion = useDB((s) => s.iniciarSesion)
  const solicitarRecuperacion = useDB((s) => s.solicitarRecuperacion)
  const [error, setError] = useState(false)
  const [recuperarAbierto, setRecuperarAbierto] = useState(false)
  const [usuarioRecuperar, setUsuarioRecuperar] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { correo: '', contrasena: '' } })

  const entrar = async (datos: Formulario) => {
    const ok = await iniciarSesion(datos.correo, datos.contrasena)
    if (!ok) {
      setError(true)
      return
    }
    setError(false)
    const usuario = useDB.getState().users.find((u) => u.correo === datos.correo.trim().toLowerCase())
    if (usuario) toast.success(`Bienvenido, ${usuario.rol === 'admin' ? 'coordinación' : usuario.nombre}.`)
    const ruta = rutaPorRol(usuario?.rol ?? 'asesor')
    window.location.hash = `#${ruta}`
  }

  const enviarSolicitud = async () => {
    const resultado = await solicitarRecuperacion(usuarioRecuperar)
    if (!resultado.ok) {
      toast.error(resultado.error ?? 'No se pudo enviar la solicitud.')
      return
    }
    toast.success('Solicitud enviada. El administrador generará una nueva contraseña y te la hará llegar.')
    setRecuperarAbierto(false)
    setUsuarioRecuperar('')
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      {usuarioActual ? <Navigate to={rutaPorRol(usuarioActual.rol)} replace /> : null}
      <section className="relative isolate min-h-[320px] overflow-hidden bg-primary lg:min-h-screen">
        <img
          src="/unidad-upn.jpg"
          alt="Entrada de la unidad de la Universidad Pedagógica Nacional"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#002a4f]/95 via-[#002a4f]/40 to-[#002a4f]/10" />
        <div className="relative flex h-full flex-col justify-between gap-10 p-6 md:p-10">
          <span className="inline-flex w-fit rounded-lg bg-white/95 p-2.5 shadow-sm">
            <img src="/logo-upn.svg" alt="Universidad Pedagógica Nacional" className="h-9 w-auto" />
          </span>
          <p className="max-w-xl text-balance text-2xl font-semibold leading-snug text-white md:text-[32px]">
            Bienvenido al sistema Mora para la automatización del proceso de titulación
          </p>
        </div>
      </section>
      <section className="grid place-items-center px-4 py-10 md:px-8">
        <div className="w-full max-w-[420px]">
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit(entrar)} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="correo">Usuario</Label>
                  <Input
                    id="correo"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="Tu usuario"
                    {...register('correo')}
                  />
                  {errors.correo ? <p className="text-[13px] text-bad-ink">{errors.correo.message}</p> : null}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="contrasena">Contraseña</Label>
                  <Input id="contrasena" type="password" placeholder="Tu contraseña" {...register('contrasena')} />
                  {errors.contrasena ? <p className="text-[13px] text-bad-ink">{errors.contrasena.message}</p> : null}
                  {error ? <p className="text-[13px] text-bad-ink">Usuario o contraseña incorrectos.</p> : null}
                </div>
                <Button type="submit" className="w-full">
                  Entrar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="-ml-2 text-muted-foreground"
                  onClick={() => setRecuperarAbierto(true)}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Dialog open={recuperarAbierto} onOpenChange={setRecuperarAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recuperar contraseña</DialogTitle>
            <DialogDescription>
              Escribe tu usuario de acceso y se enviará un aviso al administrador para que genere una nueva contraseña de manera aleatoria y te la haga llegar.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              enviarSolicitud()
            }}
            className="grid gap-4"
          >
            <div className="grid gap-2">
              <Label htmlFor="usuario-recuperar">Usuario</Label>
              <Input
                id="usuario-recuperar"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="Tu usuario (el de tu cuenta)"
                value={usuarioRecuperar}
                onChange={(e) => setUsuarioRecuperar(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRecuperarAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={usuarioRecuperar.trim().length < 3}>
                Enviar solicitud
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
