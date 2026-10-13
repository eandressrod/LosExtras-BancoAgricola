import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { errorMidi } from './servicio.js';

const recursos = { '/': ['index.html','text/html'], '/index.html': ['index.html','text/html'], '/app.js': ['app.js','text/javascript'], '/midi.css': ['midi.css','text/css'], '/schema.js': ['schema.js','text/javascript'], '/modelo.js': ['modelo.js','text/javascript'] };
const cabeceras = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" };

async function leerJson(req) {
  if (req.headers['content-type']?.split(';')[0] !== 'application/json') throw errorMidi('Se requiere JSON.', 415);
  let longitud = 0; const partes = [];
  for await (const parte of req) { longitud += parte.length; if (longitud > 1048576) throw errorMidi('El lote supera 1 MB.', 413); partes.push(parte); }
  try { return JSON.parse(Buffer.concat(partes).toString('utf8')); } catch { throw errorMidi('JSON no válido.', 400); }
}

export function crearServidorMidi({ servicio, destino = '', configurada = true }) {
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
          return json(await servicio.guardar(body.peticion, body.cambios));
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
      if (!recurso) return json({ error: 'No encontrado.' }, 404);
      if (!['GET','HEAD'].includes(req.method)) return json({ error: 'Método no permitido.' }, 405, { Allow: 'GET, HEAD' });
      const archivo = await readFile(new URL(recurso[0], import.meta.url));
      res.writeHead(200, { ...cabeceras, 'Content-Type': `${recurso[1]}; charset=utf-8` });
      res.end(req.method === 'HEAD' ? undefined : archivo);
    } catch (e) {
      json({ error: e.estado ? e.message : 'No se pudo completar la operación.' }, e.estado || 503, e.estado === 429 ? { 'Retry-After': '6' } : {});
    }
  });
  return server;
}
