# Sistema Mora de titulación

Sistema de gestión del proceso de titulación para la Universidad Pedagógica Nacional (Unidad 213 Tehuacán): expedientes de asesorados, revisiones con documentos, asignación del sínodo y exámenes profesionales.

**Arquitectura:** SPA en React + Vite desplegada en **Cloudflare Pages**, con backend en **Pages Functions** (Workers). Los datos viven en **D1** (SQLite) y los documentos en **R2**. Las contraseñas se guardan con hash PBKDF2-SHA256 y las sesiones con cookie HttpOnly. La lógica de negocio (`src/lib/dominio.ts`) es compartida entre el navegador y el servidor; el servidor valida permisos por rol y por recurso en cada acción.

## Cuentas y roles

- **admin** — coordinación: gestiona vocales, asesores, asesorados, calendario de exámenes y resoluciones de baja.
- **vocal** — coordinador de carrera: crea asesorados de su carrera, asigna el sínodo, revisa revisiones y asigna exámenes.
- **asesor** — sube revisiones de sus asesorados y solicita bajas.

Al crear una cuenta (vocal o asesor) se genera una contraseña aleatoria que se muestra una sola vez. Cualquier cuenta puede cambiar su contraseña desde el menú lateral.

## Despliegue en Cloudflare (Workers con assets estáticos)

### 1. Subir el código a GitHub

```powershell
git add -A
git rm --cached USUARIOS.txt      # si estaba versionado
git commit -m "Versión con backend en Cloudflare"
git push
```

> `USUARIOS.txt`, `presentacion/`, `.taste-skill/` y `.env*` ya están en `.gitignore`; no se publican.

### 2. Crear la base de datos y el bucket

```powershell
npx wrangler login
npx wrangler d1 create sistema-mora
npx wrangler d1 execute sistema-mora --remote --file=schema.sql
npx wrangler r2 bucket create sistema-mora-archivos
```

Si recreas la base de datos, actualiza `database_id` en `wrangler.toml`.

### 3. Conectar el repositorio en el panel

En **Workers & Pages → Create → Connect to Git**, con esta configuración de compilación:

- **Comando de compilación:** `npm run build`
- **Implementar comando:** `npx wrangler deploy`
- **Variable de entorno:** `NODE_VERSION = 22` (no definas `NODE_ENV=production`)

Las bindings **no** se configuran en el panel: ya viven en `wrangler.toml` (`DB` → D1 `sistema-mora`, `ARCHIVOS` → R2 `sistema-mora-archivos`) y `npx wrangler deploy` las aplica en cada despliegue.

### 4. Primer acceso

Entra con usuario `admin` y la contraseña inicial. **Cámbiala de inmediato** desde el menú lateral ("Cambiar contraseña"). Al primer arranque, el sistema crea sus tablas y la cuenta admin solo (sin datos de ejemplo).

## Desarrollo local

```powershell
npm install
npm run build
npx wrangler dev --port 8799
```

La API queda en `http://127.0.0.1:8799/api/*` y la aplicación en la misma URL, con D1 y R2 locales simulados.

## Notas de operación

- **Datos:** toda la información del sistema está en una fila JSON de la tabla `estado` con control de concurrencia por versión (dos cambios simultáneos no se pisan; el segundo recibe 409 y se refresca). Pensado para el volumen de una unidad UPN; si el número de asesorados crece mucho, migrar a tablas normalizadas.
- **Archivos:** hasta 10 MB por documento, en R2. Solo los descargan el admin, el vocal de la carrera o el asesor asignado.
- **Sesiones:** duran 7 días (tabla `sesiones`); se eliminan al cerrar sesión.
- **Restablecimiento de contraseña:** el usuario lo pide desde el login con su nombre de usuario; llega como notificación al administrador, quien genera una nueva contraseña aleatoria y se la hace llegar.
- **Recuperación de sesión:** el cliente consulta `/api/datos` al arrancar y cada 25 s; si la sesión expiró, se regresa al login.
- **Cabeceras de seguridad:** `public/_headers` (CSP, X-Frame-Options, etc.) para los assets; la API añade las suyas en cada respuesta.
