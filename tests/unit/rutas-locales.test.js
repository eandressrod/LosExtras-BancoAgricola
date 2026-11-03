// SCRUM-130: el servidor local deriva rutas y cabeceras de vercel.json y de los archivos de api/.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { rutasDesdeVercel, cabecerasEstaticas, cargarFunciones } from '../../scripts/rutas-locales.js';
import { RUTAS_RECURSOS } from '../../api/recursos.js';

const vercel = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));

test('SCRUM-130 cada rewrite usa la función de su destino y las funciones conservan su ruta', () => {
  const a = { fetch() {} }, recursos = { fetch() {} };
  const config = { rewrites: [{ source: '/api/x', destination: '/api/recursos?recurso=x' }] };
  assert.deepEqual(rutasDesdeVercel(config, { '/api/a': a, '/api/recursos': recursos }), { '/api/a': a, '/api/recursos': recursos, '/api/x': recursos });
  assert.throws(() => rutasDesdeVercel({ rewrites: [{ source: '/api/y', destination: '/api/nada' }] }, {}), /api\/nada/);
});

test('SCRUM-130 las cabeceras de un archivo estático salen de vercel.json', () => {
  assert.deepEqual(cabecerasEstaticas(vercel, '/pwa/sw.js'), { 'Service-Worker-Allowed': '/', 'Cache-Control': 'no-cache' });
  assert.deepEqual(cabecerasEstaticas(vercel, '/index.html'), {});
});

test('SCRUM-130 el servidor local conserva las mismas rutas que tenía escritas a mano', async () => {
  const rutas = rutasDesdeVercel(vercel, await cargarFunciones());
  assert.deepEqual(Object.keys(rutas).sort(), [
    '/api/auth/actividad', '/api/auth/login', '/api/auth/logout', '/api/auth/sesion', '/api/categorias', '/api/guardadas',
    '/api/mensajes', '/api/menu', '/api/metas', '/api/para-ti', '/api/perfiles', '/api/preferencias', '/api/promocion',
    '/api/promociones', '/api/promociones-apertura', '/api/recursos', '/api/senales', '/api/tarjetas', '/api/zonas'
  ]);
});

test('SCRUM-130 cada recurso agrupado tiene su rewrite en vercel.json y cada rewrite su recurso', () => {
  const reescritos = vercel.rewrites.map(({ destination }) => new URL(destination, 'http://local').searchParams.get('recurso'));
  assert.deepEqual(reescritos.sort(), Object.keys(RUTAS_RECURSOS).sort());
});

test('SCRUM-130 ningún handler repite la validación de sesión: todos usan exigirPerfil', async () => {
  const { readdir } = await import('node:fs/promises');
  const archivos = async dir => (await readdir(new URL(dir, import.meta.url), { recursive: true })).filter(f => f.endsWith('.js')).map(f => new URL(dir + f.replaceAll('\\', '/'), import.meta.url));
  for (const archivo of [...await archivos('../../api/'), ...await archivos('../../backend/handlers/')]) {
    const codigo = await readFile(archivo, 'utf8');
    assert.doesNotMatch(codigo, /perfilDeSesion\(/, archivo.pathname);
  }
});
