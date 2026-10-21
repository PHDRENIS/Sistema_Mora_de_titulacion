import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import '@fontsource-variable/ibm-plex-sans'
import './index.css'
import App from './App'
import { useDB } from './store/db'

const url = new URL(window.location.href)
const demo = url.searchParams.get('demo')
if (demo) {
  const cuentas: Record<string, { correo: string; contrasena: string; ruta: string }> = {
    admin: { correo: 'admin@escuela.mx', contrasena: 'admin123', ruta: '/admin' },
    vocal: { correo: 'martha.villalobos@escuela.mx', contrasena: 'vocal123', ruta: '/vocal' },
    asesor: { correo: 'elena.ramirez@escuela.mx', contrasena: 'asesor123', ruta: '/asesor' },
  }
  const cuenta = cuentas[demo]
  if (cuenta) {
    useDB.getState().iniciarSesion(cuenta.correo, cuenta.contrasena)
    const ruta = url.searchParams.get('ruta') ?? cuenta.ruta
    url.searchParams.delete('demo')
    url.searchParams.delete('ruta')
    window.history.replaceState(null, '', url.pathname + url.search)
    window.location.hash = '#' + ruta
  }
}

window.addEventListener('storage', (e) => {
  if (e.key === 'titulacion-db-v2' && e.newValue) useDB.persist.rehydrate()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
      <Toaster position="bottom-right" richColors />
    </HashRouter>
  </StrictMode>,
)

;(window as unknown as { __db: typeof useDB }).__db = useDB
