import test from 'node:test';
import assert from 'node:assert/strict';
import { crearHandlerPromociones } from '../../api/promociones.js';
import guardadas from '../../backend/handlers/guardadas.js';
import preferencias from '../../api/preferencias.js';
import { repositorioMock } from '../../backend/repositorios/mock.js';
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h10-pruebas-de-integracion'.repeat(2);

const JUEVES = new Date('2026-10-15T18:00:00Z');
const VIERNES = new Date('2026-10-16T18:00:00Z');
const handler = (ahora = JUEVES) => crearHandlerPromociones(undefined, () => ahora);

const pedir = (ruta, perfilId, opciones = {}) => new Request('http://localhost' + ruta, {
  ...opciones,
  headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), ...opciones.headers }
});

async function listar(perfilId, consulta = '', ahora = JUEVES) {
  const respuesta = await handler(ahora).fetch(pedir('/api/promociones' + consulta, perfilId));
  assert.equal(respuesta.status, 200, consulta);
  return (await respuesta.json()).map(promo => promo.id);
}

test('H10 GET /api/promociones?comercio busca parcial, sin distinguir mayúsculas y recortando espacios', async () => {
  assert.deepEqual(await listar('A', '?comercio=sim'), ['tienda']);
  assert.deepEqual(await listar('A', '?comercio=%20%20SIMAN%20%20'), ['tienda']);
  assert.deepEqual(await listar('A', '?comercio=mark'), ['cine']);
  assert.deepEqual(await listar('A', '?comercio='), ['restaurante', 'tienda', 'cine', 'starbucks']);
  assert.deepEqual(await listar('A', '?comercio=%20%20'), ['restaurante', 'tienda', 'cine', 'starbucks']);
  assert.deepEqual(await listar('A', '?comercio=noexiste'), []);
});

test('H10 la búsqueda respeta el perfil y la tarjeta propia: A no recibe exclusivas Black de B', async () => {
  assert.deepEqual(await listar('A', '?comercio=siman'), ['tienda']);
  assert.deepEqual(await listar('B', '?comercio=siman'), ['tienda', 'siman-black']);
  assert.deepEqual(await listar('A', '?comercio=siman&tarjeta=cta-a-4'), ['tienda', 'siman-black']);
  const ajena = await handler().fetch(pedir('/api/promociones?comercio=siman&tarjeta=cta-b-2', 'A'));
  assert.equal(ajena.status, 404);
});

test('H10 intersecta con intereses, categoría, Disponibles hoy y Guardadas sin modificar preferencias', async () => {
  await preferencias.fetch(pedir('/api/preferencias', 'demo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: ['Compras'] })
  }));
  const antes = await (await preferencias.fetch(pedir('/api/preferencias', 'demo'))).json();

  assert.deepEqual(await listar('demo', '?comercio=siman'), ['tienda']);
  assert.deepEqual(await listar('demo', '?comercio=starbucks'), []);
  assert.deepEqual(await listar('A', '?categoria=Restaurantes&comercio=star'), ['starbucks']);
  assert.deepEqual(await listar('A', '?categoria=Compras&comercio=star'), []);
  assert.deepEqual(await listar('A', '?hoy=1&comercio=cine', VIERNES), []);
  assert.deepEqual(await listar('A', '?hoy=1&comercio=cine', JUEVES), ['cine']);

  // Vista Guardadas filtrada por comercio
  await guardadas.fetch(pedir('/api/guardadas', 'A', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promocionId: 'tienda' })
  }));
  await guardadas.fetch(pedir('/api/guardadas', 'A', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promocionId: 'starbucks' })
  }));
  const resGuardadas = await guardadas.fetch(pedir('/api/guardadas?comercio=star', 'A'));
  assert.equal(resGuardadas.status, 200);
  assert.deepEqual((await resGuardadas.json()).promociones.map(p => p.id), ['starbucks']);

  const despues = await (await preferencias.fetch(pedir('/api/preferencias', 'demo'))).json();
  assert.deepEqual(despues, antes);
});

test('H10 rechaza sin sesión (401), parámetros inválidos (400) y propaga fallo del catálogo (503)', async () => {
  assert.equal((await handler().fetch(pedir('/api/promociones?comercio=siman'))).status, 401);
  assert.equal((await handler().fetch(pedir('/api/promociones?comercio=a&comercio=b', 'A'))).status, 400);
  const original = repositorioMock.listarPromocionesConBeneficios;
  repositorioMock.listarPromocionesConBeneficios = async () => { throw new Error('Fallo'); };
  try {
    assert.equal((await handler().fetch(pedir('/api/promociones?comercio=siman', 'A'))).status, 503);
  } finally {
    repositorioMock.listarPromocionesConBeneficios = original;
  }
});
