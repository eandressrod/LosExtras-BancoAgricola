// H22: GET /api/para-ti ordena con el motor las promociones de la tarjeta elegida según las señales del dueño de la sesión.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import recursos from '../../api/recursos.js';
import { crearHandlerParaTi } from '../../backend/handlers/para-ti.js';
import { reiniciarSenalesMock } from '../../backend/repositorios/senales.mock.js';
import { crearToken } from '../../backend/servicios/sesion.js';
import { CONFIGURACION } from '../../public/js/motor/config.js';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h22-para-ti-pruebas'.repeat(3);

const AHORA = new Date('2026-10-21T18:00:00Z');
const paraTi = crearHandlerParaTi(undefined, () => AHORA);
const pedir = (ruta, perfilId, opciones = {}) => new Request('http://localhost' + ruta, {
  ...opciones, headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), ...opciones.headers }
});
async function consultar(ruta, perfilId, handler = paraTi) {
  const respuesta = await handler.fetch(pedir(ruta, perfilId));
  assert.equal(respuesta.status, 200, ruta);
  assert.equal(respuesta.headers.get('cache-control'), 'no-store');
  return respuesta.json();
}
const declarar = (perfilId, senal) => recursos.fetch(pedir('/api/senales', perfilId, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ origen: 'encuesta', ...senal })
}));
const conTarjeta = tarjeta => new Set(fuente.promociones.filter(p => p.beneficios.some(b => b.tarjeta === tarjeta)).map(p => p.id));

beforeEach(() => reiniciarSenalesMock());

test('H22 sin sesión responde 401 y solo acepta GET', async () => {
  assert.equal((await paraTi.fetch(pedir('/api/para-ti'))).status, 401);
  assert.equal((await paraTi.fetch(pedir('/api/para-ti', 'A', { method: 'POST' }))).status, 405);
});

test('H22 con perfil vacío devuelve todo lo elegible de la tarjeta en orden base, con la versión de configuración', async () => {
  const respuesta = await consultar('/api/para-ti', 'A');
  assert.equal(respuesta.version, CONFIGURACION.version);
  assert.equal(respuesta.estrategia, 'base');
  assert.equal(respuesta.vacio, null);
  assert.deepEqual(new Set(respuesta.promociones.map(p => p.id)), conTarjeta('basica'));
  assert.ok(respuesta.promociones.every(p => p.razon === null && p.applicableCard === 'basica' && p.componentes.R === 0));
  const black = await consultar('/api/para-ti?tarjeta=cta-a-4', 'A');
  assert.deepEqual(new Set(black.promociones.map(p => p.id)), conTarjeta('black'));
});

test('H22 las señales declaradas ordenan Para ti y cada tarjeta muestra su razón', async () => {
  assert.equal((await declarar('A', { clase: 'interes', ambito: 'categoria', valor: 'Tecnología' })).status, 200);
  assert.equal((await declarar('A', { clase: 'interes', ambito: 'comercio', valor: 'pizza-hut' })).status, 200);
  const { estrategia, promociones } = await consultar('/api/para-ti', 'A');
  assert.equal(estrategia, 'personalizada');
  assert.deepEqual(new Set(promociones.map(p => p.category)), new Set(['Tecnología', 'Restaurantes']));
  assert.equal(promociones[0].merchantId, 'pizza-hut');
  assert.equal(promociones[0].razon.texto, 'Porque elegiste Pizza Hut');
  assert.ok(promociones.filter(p => p.category === 'Tecnología').every(p => p.razon.texto === 'Por tu interés en Tecnología'));
  assert.ok(promociones.filter(p => p.category === 'Restaurantes' && p.merchantId !== 'pizza-hut').every(p => p.razon === null));
});

test('H22 los filtros explícitos se validan igual que en /api/promociones y restringen sin alterarse', async () => {
  await declarar('A', { clase: 'interes', ambito: 'categoria', valor: 'Restaurantes' });
  const compras = await consultar('/api/para-ti?categoria=Compras', 'A');
  assert.ok(compras.promociones.length > 0 && compras.promociones.every(p => p.category === 'Compras'));
  const pizza = await consultar('/api/para-ti?comercio=pizza', 'A');
  assert.ok(pizza.promociones.length > 0 && pizza.promociones.every(p => p.merchant === 'Pizza Hut'));
  const nada = await consultar('/api/para-ti?comercio=inexistente', 'A');
  assert.deepEqual([nada.promociones, nada.vacio], [[], 'filtros']);
  assert.equal((await paraTi.fetch(pedir('/api/para-ti?categoria=Inventada', 'A'))).status, 400);
  assert.equal((await paraTi.fetch(pedir('/api/para-ti?hoy=2', 'A'))).status, 400);
  assert.equal((await paraTi.fetch(pedir('/api/para-ti?comercio=' + 'x'.repeat(101), 'A'))).status, 400);
  assert.equal((await paraTi.fetch(pedir('/api/para-ti?tarjeta=cta-b-2', 'A'))).status, 404);
  assert.equal((await paraTi.fetch(pedir('/api/para-ti?tarjeta=', 'A'))).status, 400);
});

test('H22 los perfiles A y B están aislados', async () => {
  await declarar('A', { clase: 'interes', ambito: 'categoria', valor: 'Salud' });
  assert.equal((await consultar('/api/para-ti', 'A')).estrategia, 'personalizada');
  const deB = await consultar('/api/para-ti', 'B');
  assert.equal(deB.estrategia, 'base');
  assert.deepEqual(new Set(deB.promociones.map(p => p.id)), conTarjeta('black'));
});

test('H22 /api/preferencias refleja sus categorías en el registro que lee Para ti', async () => {
  const guardar = await recursos.fetch(pedir('/api/senales', 'demo'));
  assert.deepEqual((await guardar.json()).senales, []);
  const { default: preferencias } = await import('../../api/preferencias.js');
  const respuesta = await preferencias.fetch(pedir('/api/preferencias', 'demo', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ categorias: ['Supermercados'] })
  }));
  assert.equal(respuesta.status, 200);
  const { promociones } = await consultar('/api/para-ti', 'demo');
  assert.ok(promociones.length > 0 && promociones.every(p => p.category === 'Supermercados' && p.razon.tipo === 'categoria'));
});

test('H22 la entrada compartida despacha /api/para-ti', async () => {
  const respuesta = await recursos.fetch(pedir('/api/para-ti', 'B'));
  assert.equal(respuesta.status, 200);
  assert.equal((await respuesta.json()).version, CONFIGURACION.version);
});
