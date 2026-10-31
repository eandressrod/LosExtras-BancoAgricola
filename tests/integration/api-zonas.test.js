// H8: GET /api/zonas. Lista fija de zonas con su centro para elegir el origen de Cerca de ti; requiere sesión.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import recursos from '../../api/recursos.js';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h8-zonas-pruebas-'.repeat(3);

const pedir = (perfilId, metodo = 'GET', ruta = 'http://localhost/api/zonas') => recursos.fetch(new Request(ruta, {
  method: metodo,
  headers: perfilId ? { cookie: `sesion_extras=${crearToken(perfilId)}` } : {}
}));

test('H8 zonas: sin sesión responde 401 y otros métodos 405', async () => {
  assert.equal((await pedir(null)).status, 401);
  const post = await pedir('A', 'POST');
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET');
});

test('H8 zonas: devuelve la lista fija con su centro, en el orden del catálogo', async () => {
  for (const ruta of ['http://localhost/api/zonas', 'http://localhost/api/recursos?recurso=zonas']) {
    const respuesta = await pedir('A', 'GET', ruta);
    assert.equal(respuesta.status, 200);
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
    const { zonas } = await respuesta.json();
    assert.deepEqual(zonas, fuente.zonas.map(({ id, nombre, centro }) => ({ id, nombre, latitud: centro.latitud, longitud: centro.longitud })));
  }
});

test('H8 zonas: la ruta corta existe en Vercel y en el servidor local', async () => {
  const config = JSON.parse(await readFile(new URL('../../vercel.json', import.meta.url), 'utf8'));
  assert.ok(config.rewrites.some(r => r.source === '/api/zonas' && r.destination === '/api/recursos?recurso=zonas'));
  const servidor = await readFile(new URL('../../scripts/dev.js', import.meta.url), 'utf8');
  assert.match(servidor, /'\/api\/zonas': recursos/);
});
