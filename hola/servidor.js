import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { resolve, sep, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { errorMidi } from './servicio.js';

const recursos = {
  '/': ['index.html','text/html'], '/index.html': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'],
  '/midi.css': ['midi.css','text/css'], '/schema.js': ['schema.js','text/javascript'], '/modelo.js': ['modelo.js','text/javascript'],
  '/arbol.js': ['arbol.js','text/javascript'],
  '/imagenes-cliente.js': ['imagenes-cliente.js','text/javascript'],
  '/recursos/computer_icon.png': ['recursos/computer_icon.png','image/png'],
  '/recursos/folder_icon.png': ['recursos/folder_icon.png','image/png'],
  '/recursos/string_icon.png': ['recursos/string_icon.png','image/png']
};
const cabeceras = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" };

async function leerJson(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw errorMidi('Se requiere JSON.', 415);
  let longitud = 0; const partes = [];
  for await (const parte of req) { longitud += parte.length; if (longitud > 12582912) throw errorMidi('El envío supera 12 MB.', 413); partes.push(parte); }
  try { return JSON.parse(Buffer.concat(partes).toString('utf8')); } catch { throw errorMidi('JSON no válido.', 400); }
}

export function crearServidorMidi({ servicio, destino = '', configurada = true, publicDir = fileURLToPath(new URL('../public/', import.meta.url)) }) {
  const token = randomBytes(32).toString('base64url');
  const server = createServer(async (req, res) => {
    const json = (valor, estado = 200, extra = {}) => { res.writeHead(estado, { ...cabeceras, 'Content-Type': 'application/json; charset=utf-8', ...extra }); res.end(JSON.stringify(valor)); };
    try {
      const puerto = server.address()?.port;
      const hosts = [`127.0.0.1:${puerto}`, `localhost:${puerto}`];
      if (!hosts.includes(req.headers.host)) throw errorMidi('Host no permitido.', 403);
      const url = new URL(req.url, `http://${req.headers.host}`);
      if (url.pathname.startsWith('/api/')) {
        const rutas = { '/api/config':'GET', '/api/datos':'GET', '/api/conexion':'GET', '/api/dependencias':'GET', '/api/guardar':'POST' };
        if (!rutas[url.pathname]) return json({ error: 'No encontrado.' }, 404);
        const origen = req.headers.origin;
        if ((origen && !hosts.map(h => `http://${h}`).includes(origen)) || (url.pathname !== '/api/config' && req.headers['x-midi-token'] !== token)) throw errorMidi('Origen o token local no permitido.', 403);
        if (req.method !== rutas[url.pathname]) return json({ error: 'Método no permitido.' }, 405, { Allow: rutas[url.pathname] });
        if (url.pathname === '/api/config') return json({ token, destino, configurada });
        if (url.pathname === '/api/guardar') {
          if (!origen) throw errorMidi('Falta el origen local.', 403);
          const body = await leerJson(req);
          return json(await servicio.guardar(body.peticion, body.cambios, body.archivos));
        }
        const lectura = await servicio.leer();
        if (url.pathname === '/api/conexion') return json({ estado: 'conectado', destino, consultadoEn: lectura.consultadoEn });
        if (url.pathname === '/api/dependencias') {
          const tabla = url.searchParams.get('tabla');
          if (!['perfiles','promociones','comercios'].includes(tabla)) throw errorMidi('Tabla no permitida.', 400);
          const fila = lectura.datos[tabla]?.find(f => f.id === url.searchParams.get('id'));
          if (!fila) throw errorMidi('Registro no encontrado.', 404);
          return json({ conteos: fila._conteos, huella: fila._dependencias || null });
        }
        return json(lectura);
      }
      const recurso = recursos[url.pathname];
      if (!recurso && url.pathname.startsWith('/recursos/')) {
        if (!['GET','HEAD'].includes(req.method)) return json({ error: 'Método no permitido.' }, 405, { Allow: 'GET, HEAD' });
        const ruta = resolve(publicDir, '.' + decodeURIComponent(url.pathname));
        const tipos = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
        const tipo = tipos[extname(ruta).toLowerCase()];
        if (!ruta.startsWith(resolve(publicDir, 'recursos') + sep) || !tipo) return json({ error: 'No encontrado.' }, 404);
        try { const archivo = await readFile(ruta); res.writeHead(200, { ...cabeceras, 'Content-Type': tipo }); res.end(req.method === 'HEAD' ? undefined : archivo); return; }
        catch (e) { if (e.code === 'ENOENT' || e.code === 'EISDIR') return json({ error: 'No encontrado.' }, 404); throw e; }
      }
      if (!recurso) return json({ error: 'No encontrado.' }, 404);
      if (!['GET','HEAD'].includes(req.method)) return json({ error: 'Método no permitido.' }, 405, { Allow: 'GET, HEAD' });
      const archivo = await readFile(new URL(recurso[0], import.meta.url));
      res.writeHead(200, { ...cabeceras, 'Content-Type': recurso[1].startsWith('image/') ? recurso[1] : `${recurso[1]}; charset=utf-8` });
      res.end(req.method === 'HEAD' ? undefined : archivo);
    } catch (e) {
      json({ error: e.estado ? e.message : 'No se pudo completar la operación.' }, e.estado || 503, e.estado === 429 ? { 'Retry-After': '6' } : {});
    }
  });
  return server;
}
