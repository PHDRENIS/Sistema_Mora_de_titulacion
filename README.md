# Sistema Mora de titulación

Sistema de gestión del proceso de titulación para la Universidad Pedagógica Nacional (Unidad 213 Tehuacán): expedientes de asesorados, revisiones con documentos, asignación del sínodo y exámenes profesionales.

**Arquitectura:** SPA en React + Vite desplegada en **Cloudflare Pages**, con backend en **Pages Functions** (Workers). Los datos viven en **D1** (SQLite) y los documentos en **R2**. Las contraseñas se guardan con hash PBKDF2-SHA256 y las sesiones con cookie HttpOnly. La lógica de negocio (`src/lib/dominio.ts`) es compartida entre el navegador y el servidor; el servidor valida permisos por rol y por recurso en cada acción.

## Cuentas y roles

- **admin** — coordinación: gestiona vocales, asesores, asesorados, calendario de exámenes y resoluciones de baja.
- **vocal** — coordinador de carrera: crea asesorados de su carrera, asigna el sínodo, revisa revisiones y asigna exámenes.
- **asesor** — sube revisiones de sus asesorados y solicita bajas.

Al crear una cuenta (vocal o asesor) se genera una contraseña aleatoria que se muestra una sola vez. Cualquier cuenta puede cambiar su contraseña desde el menú lateral.

## Despliegue en Cloudflare Pages

### 1. Subir el código a GitHub

```powershell
git add -A
git rm --cached USUARIOS.txt      # si estaba versionado
git commit -m "Versión con backend en Cloudflare"
git push
```

> `USUARIOS.txt`, `presentacion/`, `.taste-skill/` y `.env*` ya están en `.gitignore`; no se publican.

### 2. Crear el proyecto en Cloudflare

1. En el panel de Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**; elige el repositorio.
2. Configuración de build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Variable de entorno:** `NODE_VERSION = 22` (no definas `NODE_ENV=production`; impediría instalar devDependencies).
3. Despliega. La primera vez fallará hasta crear las bindings del paso 3.

### 3. Crear la base de datos y el bucket

```powershell
npx wrangler d1 create sistema-mora
npx wrangler d1 execute sistema-mora --remote --file=schema.sql
npx wrangler r2 bucket create sistema-mora-archivos
```

### 4. Conectar las bindings

En **Workers & Pages → (tu proyecto) → Settings → Bindings → Add**:

| Tipo | Nombre de la variable | Valor |
| --- | --- | --- |
| D1 database | `DB` | `sistema-mora` |
| R2 bucket | `ARCHIVOS` | `sistema-mora-archivos` |

(Opcional, recomendado): una variable o secret llamada `ADMIN_CONTRASENA` con la contraseña inicial del administrador. Si no existe, la contraseña inicial es la documentada en `USUARIOS.txt`.

Vuelve a **Deploy** para que las bindings apliquen.

### 5. Primer acceso

Entra con usuario `admin` y la contraseña inicial. **Cámbiala de inmediato** desde el menú lateral ("Cambiar contraseña").

## Desarrollo local

```powershell
npm install
npm run build
npx wrangler pages dev dist --d1 DB --r2 ARCHIVOS
```

Aplica el esquema local si hace falta:

```powershell
npx wrangler d1 execute sistema-mora --local --file=schema.sql
```

## Notas de operación

- **Datos:** toda la información del sistema está en una fila JSON de la tabla `estado` con control de concurrencia por versión (dos cambios simultáneos no se pisan; el segundo recibe 409 y se refresca). Pensado para el volumen de una unidad UPN; si el número de asesorados crece mucho, migrar a tablas normalizadas.
- **Archivos:** hasta 10 MB por documento, en R2. Solo los descargan el admin, el vocal de la carrera o el asesor asignado.
- **Sesiones:** duran 7 días (tabla `sesiones`); se eliminan al cerrar sesión.
- **Restablecimiento de contraseña:** el usuario lo pide desde el login con su nombre de usuario; llega como notificación al administrador, quien genera una nueva contraseña aleatoria y se la hace llegar.
- **Recuperación de sesión:** el cliente consulta `/api/datos` al arrancar y cada 25 s; si la sesión expiró, se regresa al login.
- **Cabeceras de seguridad:** `public/_headers` (CSP, X-Frame-Options, etc.) para los assets; la API añade las suyas en cada respuesta.
