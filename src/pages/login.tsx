import { GraduationCap } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { rutaPorRol, restablecerDatos, useDB } from '@/store/db'

const esquema = z.object({
  correo: z.string().email('Escribe un correo válido.'),
  contrasena: z.string().min(1, 'Escribe tu contraseña.'),
})

type Formulario = z.infer<typeof esquema>

export default function Login() {
  const iniciarSesion = useDB((s) => s.iniciarSesion)
  const [error, setError] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Formulario>({ resolver: zodResolver(esquema), defaultValues: { correo: '', contrasena: '' } })

  const entrar = (datos: Formulario) => {
    const ok = iniciarSesion(datos.correo, datos.contrasena)
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

  return (
    <div className="grid min-h-screen place-items-center px-4 py-10 md:px-8">
      <div className="grid w-full max-w-[880px] gap-8 md:grid-cols-[1fr_360px] md:items-center">
        <div className="min-w-0">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="size-5" />
            </span>
            <h1 className="text-[28px] font-semibold leading-none tracking-[-0.01em]">Sistema Mora de titulación</h1>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Los asesores registran los avances y revisiones de cada asesorado; la coordinación los acepta y deja una nota que el asesor lee en el expediente. Las credenciales de las cuentas de prueba están en el archivo USUARIOS.txt del proyecto.
          </p>
          <Button variant="ghost" size="sm" className="mt-4 -ml-2" onClick={restablecerDatos}>
            Restablecer datos de prueba
          </Button>
        </div>
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit(entrar)} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="correo">Correo</Label>
                <Input id="correo" type="email" placeholder="nombre@escuela.mx" {...register('correo')} />
                {errors.correo ? <p className="text-[13px] text-bad-ink">{errors.correo.message}</p> : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contrasena">Contraseña</Label>
                <Input id="contrasena" type="password" placeholder="Tu contraseña" {...register('contrasena')} />
                {errors.contrasena ? <p className="text-[13px] text-bad-ink">{errors.contrasena.message}</p> : null}
                {error ? <p className="text-[13px] text-bad-ink">Correo o contraseña incorrectos.</p> : null}
              </div>
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
