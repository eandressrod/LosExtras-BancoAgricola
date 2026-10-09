// Servidor local del producto: usa los mismos handlers HTTP que Vercel.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import perfiles from '../api/perfiles.js';
import promociones from '../api/promociones.js';
import promocion from '../api/promocion.js';
import login from '../api/auth/login.js';
import sesion from '../api/auth/sesion.js';
import logout from '../api/auth/logout.js';
import menu from '../api/menu.js';

const publicDir = fileURLToPath(new URL('../public/', import.meta.url));
const routes = {
  '/api/perfiles': perfiles,
  '/api/promociones': promociones,
  '/api/promocion': promocion,
  '/api/auth/login': login,
  '/api/auth/sesion': sesion,
  '/api/auth/logout': logout,
  '/api/menu': menu
};
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Solo en local: sin SESSION_SECRET en .env se usa una clave temporal. En Vercel es obligatoria.
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = randomBytes(32).toString('base64url');
  console.warn('SESSION_SECRET no está en .env: se usa una clave temporal y las sesiones se cierran al reiniciar.');
}

async function leerCuerpo(req) {
  if (['GET', 'HEAD'].includes(req.method)) return undefined;
  const partes = [];
  for await (const parte of req) partes.push(parte);
  return Buffer.concat(partes);
}

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const handler = routes[url.pathname];
    if (handler) {
      const request = new Request(url, { method: req.method, headers: req.headers, body: await leerCuerpo(req) });
      const response = await handler.fetch(request);
      const headers = Object.fromEntries(response.headers);
      const cookies = response.headers.getSetCookie();
      if (cookies.length > 0) headers['set-cookie'] = cookies;
      res.writeHead(response.status, headers);
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, { Allow: 'GET, HEAD' });
      res.end();
      return;
    }
    const path = resolve(publicDir, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(publicDir.endsWith(sep) ? publicDir : publicDir + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : content);
  } catch (error) {
    const status = ['ENOENT', 'EISDIR'].includes(error.code) ? 404 : 500;
    res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(status === 404 ? 'No encontrado.' : 'Error del servidor local.');
  }
}).listen(3000, '127.0.0.1', () => console.log('Los Extras: http://localhost:3000'));
