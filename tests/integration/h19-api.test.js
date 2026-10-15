import test from 'node:test';
import assert from 'node:assert/strict';
import { crearToken, NOMBRE_COOKIE } from '../../backend/servicios/sesion.js';
import { estadoActividad } from '../../backend/repositorios/accesos.mock.js';
process.env.SESSION_SECRET = 'h19-test-secret-'.repeat(3);

const acceso = { estadoActividad, async buscarPerfilPorId(id) { return { id, nombre: id, tipoTarjeta: 'basica' }; }, async sesionRevocada() { return false; } };
function req(ruta, perfil = 'A', method = 'GET', cuerpo) {
  return new Request('http://local' + ruta, { method, headers: { ...(perfil ? { Cookie: NOMBRE_COOKIE + '=' + crearToken(perfil) } : {}), 'Content-Type': 'application/json' }, body: cuerpo ? JSON.stringify(cuerpo) : undefined });
}

test('H19 TDD: mensajes son propios y marcar ajeno no cambia sus datos', async () => {
  const { crearRepositorioProductosMock } = await import('../../backend/repositorios/productos-menu.mock.js');
  const { crearHandlerMensajes } = await import('../../api/mensajes.js');
  const repo = crearRepositorioProductosMock({ mensajes: [{ id: 'm-a', perfilId: 'A', titulo: 'A', texto: 'Aviso A', leido: false }, { id: 'm-b', perfilId: 'B', titulo: 'B', texto: 'Aviso B', leido: false }] });
  const api = crearHandlerMensajes({ accesos: () => acceso, productos: () => repo });
  assert.equal((await api.fetch(req('/api/mensajes', null))).status, 401);
  assert.deepEqual((await (await api.fetch(req('/api/mensajes'))).json()).map(m => m.id), ['m-a']);
  assert.equal((await api.fetch(req('/api/mensajes', 'A', 'PATCH', { id: 'm-b' }))).status, 404);
  assert.equal((await api.fetch(req('/api/mensajes', 'A', 'PATCH', { id: 'm-a', perfilId: 'B' }))).status, 200);
  assert.equal((await repo.listarMensajes('A'))[0].leido, true);
  assert.equal((await repo.listarMensajes('B'))[0].leido, false);
});

test('H19 TDD: metas CRUD valida montos, persiste y exige propietario', async () => {
  const { crearRepositorioProductosMock } = await import('../../backend/repositorios/productos-menu.mock.js');
  const { crearHandlerMetas } = await import('../../api/metas.js');
  const repo = crearRepositorioProductosMock({ metas: [] });
  const api = crearHandlerMetas({ accesos: () => acceso, productos: () => repo });
  assert.equal((await api.fetch(req('/api/metas', null))).status, 401);
  assert.equal((await api.fetch(req('/api/metas', 'A', 'POST', { nombre: '', objetivo: 0 }))).status, 400);
  const res = await api.fetch(req('/api/metas', 'A', 'POST', { nombre: 'Viaje', objetivo: 500, ahorrado: 125, perfilId: 'B' }));
  assert.equal(res.status, 201);
  const meta = await res.json();
  assert.equal((await (await api.fetch(req('/api/metas'))).json()).length, 1);
  assert.equal((await (await api.fetch(req('/api/metas', 'B'))).json()).length, 0);
  assert.equal((await api.fetch(req('/api/metas', 'B', 'PATCH', { ...meta, ahorrado: 150 }))).status, 404);
  assert.equal((await api.fetch(req('/api/metas', 'A', 'PATCH', { ...meta, ahorrado: 150 }))).status, 200);
  assert.equal((await api.fetch(req('/api/metas', 'B', 'DELETE', { id: meta.id }))).status, 404);
  assert.equal((await api.fetch(req('/api/metas', 'A', 'DELETE', { id: meta.id }))).status, 204);
  assert.equal((await repo.listarMetas('A')).length, 0);
});
