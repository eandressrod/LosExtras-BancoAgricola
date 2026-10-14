import test from 'node:test';
import assert from 'node:assert/strict';
import tarjetas, { crearHandlerTarjetas } from '../../api/tarjetas.js';
import promociones, { crearHandlerPromociones } from '../../api/promociones.js';
import promocion from '../../api/promocion.js';
import preferencias from '../../api/preferencias.js';
import * as accesos from '../../backend/repositorios/accesos.mock.js';
import { obtenerRepositorio, obtenerRepositorioPreferencias } from '../../backend/repositorios/index.js';
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h16-pruebas-de-integracion'.repeat(2);

const pedir = (ruta, perfilId, opciones = {}) => new Request('http://localhost' + ruta, {
  ...opciones,
  headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), ...opciones.headers }
});
async function json(handler, ruta, perfilId) {
  const respuesta = await handler.fetch(pedir(ruta, perfilId));
  assert.equal(respuesta.status, 200, ruta);
  return respuesta.json();
}
const beneficios = lista => lista.map(promo => `${promo.id}: ${promo.benefit}`);

test('H16 GET /api/tarjetas sin sesión responde 401', async () => {
  assert.equal((await tarjetas.fetch(pedir('/api/tarjetas'))).status, 401);
});

test('H16 GET /api/tarjetas entrega solo las tarjetas del usuario, con tipo y referencia enmascarada', async () => {
  assert.deepEqual(await json(tarjetas, '/api/tarjetas?perfil=B&usuario_id=B', 'A'), [
    { id: 'cta-a-3', tipoTarjeta: 'basica', nombre: 'Tarjeta de Crédito Básica', numeroEnmascarado: '•••• 4821', predeterminada: true },
    { id: 'cta-a-4', tipoTarjeta: 'black', nombre: 'Tarjeta de Crédito Black', numeroEnmascarado: '•••• 7754', predeterminada: false }
  ]);
  assert.deepEqual(await json(tarjetas, '/api/tarjetas', 'B'), [
    { id: 'cta-b-2', tipoTarjeta: 'black', nombre: 'Tarjeta de Crédito Black', numeroEnmascarado: '•••• 0341', predeterminada: true }
  ]);
  assert.deepEqual((await json(tarjetas, '/api/tarjetas', 'demo')).map(tarjeta => tarjeta.tipoTarjeta), ['basica']);
});

test('H16 elegir la Black de A cambia ofertas y beneficio y mantiene sus intereses', async () => {
  const guardado = await preferencias.fetch(pedir('/api/preferencias', 'A', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: ['Restaurantes', 'Compras'] })
  }));
  assert.equal(guardado.status, 200);
  const intereses = await json(preferencias, '/api/preferencias', 'A');
  assert.deepEqual(beneficios(await json(promociones, '/api/promociones', 'A')), [
    'restaurante: 10 % de descuento', 'tienda: 15 % de descuento', 'starbucks: 10 % de descuento'
  ]);
  assert.deepEqual(beneficios(await json(promociones, '/api/promociones?tarjeta=cta-a-4', 'A')), [
    'restaurante: 20 % de descuento', 'tienda: 25 % de descuento', 'starbucks: 20 % de descuento', 'siman-black: 30 % de descuento'
  ]);
  assert.deepEqual(await json(preferencias, '/api/preferencias', 'A'), intereses);
});

test('H16 la tarjeta elegida se combina con el filtro de categoría', async () => {
  assert.deepEqual((await json(promociones, '/api/promociones?categoria=Compras&tarjeta=cta-a-4', 'A')).map(promo => promo.id), ['tienda', 'siman-black']);
});

test('H16 el detalle mantiene la tarjeta elegida', async () => {
  const exclusiva = await json(promocion, '/api/promocion?id=siman-black&tarjeta=cta-a-4', 'A');
  assert.equal(exclusiva.applicableCard, 'black');
  assert.equal(exclusiva.exclusive, true);
  assert.equal((await json(promocion, '/api/promocion?id=tienda&tarjeta=cta-a-4', 'A')).benefit, '25 % de descuento');
  assert.equal((await promocion.fetch(pedir('/api/promocion?id=siman-black', 'A'))).status, 404);
});

test('H16 no se puede usar la tarjeta de otro usuario manipulando el ID', async () => {
  for (const [handler, ruta] of [[promociones, '/api/promociones?tarjeta=cta-b-2'], [promocion, '/api/promocion?id=tienda&tarjeta=cta-b-2']]) {
    const respuesta = await handler.fetch(pedir(ruta, 'A'));
    assert.equal(respuesta.status, 404, ruta);
    assert.deepEqual(await respuesta.json(), { error: 'Tarjeta no encontrada.' });
  }
  assert.equal((await promociones.fetch(pedir('/api/promociones?tarjeta=cta-a-3&tarjeta=cta-a-4', 'A'))).status, 400);
});

test('H16 un usuario con una sola tarjeta la usa directamente', async () => {
  const sinElegir = await json(promociones, '/api/promociones', 'B');
  assert.equal(sinElegir.length, 5);
  assert.ok(sinElegir.every(promo => promo.applicableCard === 'black'));
  assert.deepEqual(await json(promociones, '/api/promociones?tarjeta=cta-b-2', 'B'), sinElegir);
});

test('H16 sin tarjetas propias no hay tarjetas ni ofertas que mostrar', async () => {
  const soloAhorro = { async listarPorPerfil() { return [{ id: 'ahorro', nombre: 'Ahorro', tipo: 'Cuenta de ahorro', segmento: 'Básica', numeroEnmascarado: '•••• 1' }]; } };
  const repositorios = { accesos: () => accesos, cuentas: () => soloAhorro, preferencias: obtenerRepositorioPreferencias, catalogo: obtenerRepositorio };
  assert.deepEqual(await json(crearHandlerTarjetas(repositorios), '/api/tarjetas', 'A'), []);
  assert.deepEqual(await json(crearHandlerPromociones(repositorios), '/api/promociones', 'A'), []);
});

test('H16 un error al consultar las tarjetas responde 503', async () => {
  const falla = { async listarPorPerfil() { throw new Error('Cuentas no disponibles'); } };
  const respuesta = await crearHandlerTarjetas({ accesos: () => accesos, cuentas: () => falla }).fetch(pedir('/api/tarjetas', 'A'));
  assert.equal(respuesta.status, 503);
  assert.deepEqual(await respuesta.json(), { error: 'No se pudieron cargar tus tarjetas.' });
});
