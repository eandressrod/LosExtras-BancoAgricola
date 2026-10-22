import test from 'node:test';
import assert from 'node:assert/strict';
import { crearHandlerPromociones } from '../../api/promociones.js';
import promocion from '../../api/promocion.js';
import preferencias from '../../api/preferencias.js';
import { repositorioMock } from '../../backend/repositorios/mock.js';
import { crearToken } from '../../backend/servicios/sesion.js';
import { soloH4 } from '../promociones-h4.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h17-pruebas-de-integracion'.repeat(2);

// Promociones de H4 en el mock: vigentes del 9 oct al 31 dic de 2026 (H24 extendió el fin); el cine solo de lunes a jueves.
const JUEVES = new Date('2026-10-15T18:00:00Z');
const VIERNES = new Date('2026-10-16T18:00:00Z');
const enFecha = ahora => crearHandlerPromociones(undefined, () => ahora);

const pedir = (ruta, perfilId, opciones = {}) => new Request('http://localhost' + ruta, {
  ...opciones,
  headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), ...opciones.headers }
});
async function listar(ahora, perfilId, consulta = '') {
  const respuesta = await enFecha(ahora).fetch(pedir('/api/promociones' + consulta, perfilId));
  assert.equal(respuesta.status, 200, consulta);
  return soloH4(await respuesta.json()).map(promo => promo.id);
}

test('H17 GET /api/promociones?hoy=1 deja solo lo aplicable cuyo día y vigencia incluyen hoy', async () => {
  assert.deepEqual(await listar(JUEVES, 'A', '?hoy=1'), ['restaurante', 'tienda', 'cine', 'starbucks']);
  assert.deepEqual(await listar(VIERNES, 'A', '?hoy=1'), ['restaurante', 'tienda', 'starbucks']);
  assert.deepEqual(await listar(VIERNES, 'A'), ['restaurante', 'tienda', 'cine', 'starbucks']);
});

test('H17 no incluye ofertas futuras ni vencidas y respeta los límites de vigencia', async () => {
  assert.deepEqual(await listar(new Date('2026-10-09T05:59:59Z'), 'A', '?hoy=1'), []);
  assert.deepEqual(await listar(new Date('2026-10-09T06:00:00Z'), 'A', '?hoy=1'), ['restaurante', 'tienda', 'starbucks']);
  // El 31 de diciembre de 2026 es jueves: aplica también el cine.
  assert.deepEqual(await listar(new Date('2027-01-01T05:59:59Z'), 'A', '?hoy=1'), ['restaurante', 'tienda', 'cine', 'starbucks']);
  assert.deepEqual(await listar(new Date('2027-01-01T06:00:00Z'), 'A', '?hoy=1'), []);
});

test('H17 se combina con la categoría y la tarjeta elegida sin ampliar el conjunto aplicable', async () => {
  assert.deepEqual(await listar(JUEVES, 'A', '?categoria=Entretenimiento&hoy=1'), ['cine']);
  assert.deepEqual(await listar(VIERNES, 'A', '?categoria=Entretenimiento&hoy=1'), []);
  assert.deepEqual(await listar(VIERNES, 'A', '?categoria=Compras&hoy=1&tarjeta=cta-a-4'), ['tienda', 'siman-black']);
  assert.deepEqual(await listar(VIERNES, 'A', '?categoria=Compras&hoy=1&tarjeta=cta-a-3'), ['tienda']);
  assert.deepEqual(await listar(VIERNES, 'B', '?hoy=1'), ['restaurante', 'tienda', 'starbucks', 'siman-black']);
});

test('H17 respeta los intereses guardados y no los modifica', async () => {
  const guardado = await preferencias.fetch(pedir('/api/preferencias', 'demo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: ['Entretenimiento', 'Compras'] })
  }));
  assert.equal(guardado.status, 200);
  const antes = await (await preferencias.fetch(pedir('/api/preferencias', 'demo'))).json();
  assert.deepEqual(await listar(JUEVES, 'demo', '?hoy=1'), ['tienda', 'cine']);
  assert.deepEqual(await listar(VIERNES, 'demo', '?hoy=1'), ['tienda']);
  assert.deepEqual(await (await preferencias.fetch(pedir('/api/preferencias', 'demo'))).json(), antes);
});

test('H17 cada oferta explica si está disponible hoy y conserva mínimo, tope y medio de pago', async () => {
  const respuesta = await enFecha(VIERNES).fetch(pedir('/api/promociones', 'A'));
  const lista = await respuesta.json();
  assert.deepEqual(soloH4(lista).map(promo => [promo.id, promo.availableToday]), [['restaurante', true], ['tienda', true], ['cine', false], ['starbucks', true]]);
  const tienda = lista.find(promo => promo.id === 'tienda');
  assert.equal(tienda.minimumPurchase, 30);
  assert.equal(tienda.discountCap, 15);
  assert.equal(tienda.payment, 'Tarjeta Básica');
});

test('H17 rechaza con 400 un valor de hoy no válido', async () => {
  for (const consulta of ['?hoy=0', '?hoy=', '?hoy=si', '?hoy=1&hoy=1']) {
    const respuesta = await enFecha(JUEVES).fetch(pedir('/api/promociones' + consulta, 'A'));
    assert.equal(respuesta.status, 400, consulta);
    assert.match((await respuesta.json()).error, /no válido/);
  }
});

test('H17 sin sesión responde 401 y un fallo del catálogo 503 para permitir reintentar', async () => {
  assert.equal((await enFecha(JUEVES).fetch(pedir('/api/promociones?hoy=1'))).status, 401);
  const original = repositorioMock.listarPromocionesConBeneficios;
  repositorioMock.listarPromocionesConBeneficios = async () => { throw new Error('Catálogo no disponible'); };
  try {
    assert.equal((await enFecha(JUEVES).fetch(pedir('/api/promociones?hoy=1', 'A'))).status, 503);
  } finally {
    repositorioMock.listarPromocionesConBeneficios = original;
  }
});

test('H17 el detalle informa la misma disponibilidad de hoy que el listado', async () => {
  const ahora = new Date();
  const lista = await (await enFecha(ahora).fetch(pedir('/api/promociones', 'A'))).json();
  assert.equal(soloH4(lista).length, 4);
  for (const item of lista) {
    assert.equal(typeof item.availableToday, 'boolean', item.id);
    const respuesta = await promocion.fetch(pedir('/api/promocion?id=' + item.id, 'A'));
    assert.equal(respuesta.status, 200);
    assert.equal((await respuesta.json()).availableToday, item.availableToday, item.id);
  }
});
