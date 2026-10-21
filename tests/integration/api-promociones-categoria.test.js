import test from 'node:test';
import assert from 'node:assert/strict';
import promociones from '../../api/promociones.js';
import preferencias from '../../api/preferencias.js';
import { repositorioMock } from '../../backend/repositorios/mock.js';
import { obtenerRepositorioPreferencias } from '../../backend/repositorios/index.js';
import { crearToken } from '../../backend/servicios/sesion.js';
import { soloH4 } from '../promociones-h4.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h5-pruebas-de-integracion'.repeat(2);

const pedir = (ruta, perfilId, opciones = {}) => new Request('http://localhost' + ruta, {
  ...opciones,
  headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), ...opciones.headers }
});
async function listar(perfilId, consulta = '') {
  const respuesta = await promociones.fetch(pedir('/api/promociones' + consulta, perfilId));
  assert.equal(respuesta.status, 200, consulta);
  return soloH4(await respuesta.json()).map(promo => promo.id);
}
const preferenciasDe = async perfilId => (await preferencias.fetch(pedir('/api/preferencias', perfilId))).json();

test('H5 GET /api/promociones?categoria filtra las ofertas aplicables con la encuesta omitida', async () => {
  assert.deepEqual(await listar('A'), ['restaurante', 'tienda', 'cine', 'starbucks']);
  assert.deepEqual(await listar('A', '?categoria=Restaurantes'), ['restaurante', 'starbucks']);
  assert.deepEqual(await listar('A', '?categoria=Entretenimiento'), ['cine']);
});

test('H5 cada perfil filtra sobre su tarjeta: la exclusiva Black no aparece en Básica', async () => {
  assert.deepEqual(await listar('A', '?categoria=Compras'), ['tienda']);
  assert.deepEqual(await listar('B', '?categoria=Compras'), ['tienda', 'siman-black']);
});

test('H5 con varias categorías de interés el filtro no las amplía ni modifica las preferencias', async () => {
  const guardado = await preferencias.fetch(pedir('/api/preferencias', 'demo', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: ['Restaurantes', 'Compras'] })
  }));
  assert.equal(guardado.status, 200);
  const antes = await preferenciasDe('demo');
  assert.deepEqual(await listar('demo', '?categoria=Compras'), ['tienda']);
  assert.deepEqual(await listar('demo', '?categoria=Entretenimiento'), []);
  assert.deepEqual(await listar('demo'), ['restaurante', 'tienda', 'starbucks']);
  assert.deepEqual(await preferenciasDe('demo'), antes);
});

test('H5 rechaza con 400 una categoría desconocida, repetida o vacía', async () => {
  for (const consulta of ['?categoria=Bancos', '?categoria=Todas', '?categoria=', '?categoria=Compras&categoria=Restaurantes']) {
    const respuesta = await promociones.fetch(pedir('/api/promociones' + consulta, 'A'));
    assert.equal(respuesta.status, 400, consulta);
    assert.match((await respuesta.json()).error, /Categoría no válida/);
  }
});

test('H5 acepta una categoría nueva del catálogo y rechaza la que ya no existe', async () => {
  const repo = obtenerRepositorioPreferencias();
  const original = repo.obtenerCategorias;
  repo.obtenerCategorias = async () => [
    { id: 'Restaurantes', nombre: 'Restaurantes' }, { id: 'Compras', nombre: 'Compras' }, { id: 'Viajes', nombre: 'Viajes' }
  ];
  try {
    assert.deepEqual(await listar('A', '?categoria=Viajes'), []);
    assert.equal((await promociones.fetch(pedir('/api/promociones?categoria=Entretenimiento', 'A'))).status, 400);
  } finally {
    repo.obtenerCategorias = original;
  }
});

test('H5 sin sesión responde 401 aunque la categoría sea válida', async () => {
  assert.equal((await promociones.fetch(pedir('/api/promociones?categoria=Compras'))).status, 401);
});

test('H5 un error al consultar el catálogo responde 503 y no altera las preferencias', async () => {
  const antes = await preferenciasDe('demo');
  const original = repositorioMock.listarPromocionesConBeneficios;
  repositorioMock.listarPromocionesConBeneficios = async () => { throw new Error('Catálogo no disponible'); };
  try {
    assert.equal((await promociones.fetch(pedir('/api/promociones?categoria=Compras', 'demo'))).status, 503);
  } finally {
    repositorioMock.listarPromocionesConBeneficios = original;
  }
  assert.deepEqual(await preferenciasDe('demo'), antes);
  assert.deepEqual(await listar('demo', '?categoria=Compras'), ['tienda']);
});
