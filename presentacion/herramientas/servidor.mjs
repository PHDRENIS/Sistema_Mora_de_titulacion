import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = fileURLToPath(new URL('../../dist', import.meta.url))
const PUERTO = 4173
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
}

createServer(async (req, res) => {
  try {
    const ruta = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    let archivo = join(raiz, normalize(ruta))
    if (!archivo.startsWith(raiz + sep) && archivo !== raiz) archivo = join(raiz, 'index.html')
    let contenido
    try {
      contenido = await readFile(archivo)
    } catch {
      archivo = join(raiz, 'index.html')
      contenido = await readFile(archivo)
    }
    res.writeHead(200, { 'content-type': tipos[extname(archivo)] ?? 'application/octet-stream' })
    res.end(contenido)
  } catch {
    res.writeHead(404)
    res.end()
  }
}).listen(PUERTO, '127.0.0.1', () => console.log(`Servidor listo en http://127.0.0.1:${PUERTO}`))
