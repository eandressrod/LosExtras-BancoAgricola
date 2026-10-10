import test from 'node:test';
import assert from 'node:assert/strict';
import perfiles from '../../api/perfiles.js';
import promociones from '../../api/promociones.js';
import promocion from '../../api/promocion.js';
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'regresion-catalogo-'.repeat(3);
const headers = { cookie: 'sesion_extras=' + crearToken('demo') };

test('API de perfiles integra handler y repositorio', async () => {
  const respuesta = await perfiles.fetch(new Request('http://localhost/api/perfiles'));
  assert.equal(respuesta.status, 200);
  assert.ok((await respuesta.json()).some(perfil => perfil.id === 'demo'));
});

test('API de perfiles incluye A y B sin exponer credenciales de acceso', async () => {
  const lista = await (await perfiles.fetch(new Request('http://localhost/api/perfiles'))).json();
  assert.ok(['A', 'B'].every(id => lista.some(perfil => perfil.id === id)));
  assert.ok(lista.every(perfil => Object.keys(perfil).join() === 'id,nombre'));
});

test('API de listado y detalle devuelven la misma promoción', async () => {
  const lista = await promociones.fetch(new Request('http://localhost/api/promociones', { headers }));
  assert.equal(lista.status, 200);
  for (const item of await lista.json()) {
    const detalle = await promocion.fetch(new Request(`http://localhost/api/promocion?id=${item.id}`, { headers }));
    assert.equal(detalle.status, 200);
    assert.deepEqual(await detalle.json(), item);
  }
});

test('API controla id ausente/desconocido y métodos no soportados', async () => {
  assert.equal((await promocion.fetch(new Request('http://localhost/api/promocion'))).status, 400);
  assert.equal((await promocion.fetch(new Request('http://localhost/api/promocion?id=no-existe', { headers }))).status, 404);
  for (const handler of [perfiles, promociones, promocion]) {
    const respuesta = await handler.fetch(new Request('http://localhost/api/prueba', { method: 'POST' }));
    assert.equal(respuesta.status, 405);
    assert.equal(respuesta.headers.get('Allow'), 'GET');
  }
});

test('API devuelve error controlado sin sustituir fuente fallida por mock', async () => {
  process.env.DATA_SOURCE = 'invalida';
  try {
    for (const handler of [perfiles, promociones, promocion]) {
      const respuesta = await handler.fetch(new Request('http://localhost/api/promocion?id=cine'));
      assert.equal(respuesta.status, 503);
      assert.deepEqual(Object.keys(await respuesta.json()), ['error']);
    }
  } finally { process.env.DATA_SOURCE = 'mock'; }
});
