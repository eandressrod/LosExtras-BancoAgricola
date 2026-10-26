// H22: la página Para ti consume el orden de /api/para-ti, muestra razón e insignias y conserva la instantánea de la visita.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, almacen } from './pagina-promociones.js';
import { guardarInstantanea } from '../../public/js/instantanea.js';

const promo = (id, extra = {}) => ({ id, merchant: id.toUpperCase(), benefit: '10 %', category: 'Compras', validUntil: '2099-12-31', ...extra });
const respuesta = (promociones, extra = {}) => ({ version: 'v', estrategia: 'personalizada', vacio: null, promociones, ...extra });
const parte = (enlace, selector) => enlace.querySelector(selector);
const tarjetas = p => p.cards.hijos;

test('H22 cada tarjeta muestra la razón y las insignias que entrega el motor, en su orden', async () => {
  const p = await abrirListado({ responder: () => respuesta([
    promo('tienda', { razon: { tipo: 'comercio', texto: 'Porque elegiste TIENDA' }, insignias: [{ tipo: 'canal', valor: 'delivery', texto: 'A domicilio' }] }),
    promo('cine', { razon: null, insignias: [] })
  ]) });
  assert.deepEqual(p.consultas, [`/api/para-ti`]);
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-tienda', 'promo-cine']);
  const [tienda, cine] = tarjetas(p);
  assert.equal(parte(tienda, '.promo-reason').textContent, 'Porque elegiste TIENDA');
  assert.equal(parte(tienda, '.promo-reason').hidden, false);
  assert.equal(parte(tienda, '.promo-badges').textContent, 'A domicilio');
  assert.equal(parte(cine, '.promo-reason').hidden, true);
  assert.equal(parte(cine, '.promo-badges').hidden, true);
  assert.equal(parte(cine, '.promo-expired').hidden, true);
});

test('H22 sin catálogo para la tarjeta se indica sin ofrecer cambiar filtros ni intereses', async () => {
  const p = await abrirListado({ responder: () => respuesta([], { vacio: 'sin-catalogo' }) });
  assert.equal(p.obtener('#list-status').textContent, 'No hay promociones para tu tarjeta.');
  for (const boton of ['#show-all', '#exit-today', '#clear-search-empty', '#empty-preferences']) assert.equal(p.obtener(boton).hidden, true, boton);
});

test('H22 volver del detalle reutiliza la instantánea: mismo orden, sin consultar y con las vencidas marcadas', async () => {
  const sesion = almacen();
  const guardada = respuesta([promo('cine'), promo('tienda', { validUntil: '2020-01-01' })]);
  guardarInstantanea(sesion, 'A', `/api/para-ti`, guardada);
  const p = await abrirListado({ sesion, hash: '#promo-tienda', responder: () => assert.fail('No debe volver a ordenar') });
  assert.deepEqual(p.consultas, []);
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-cine', 'promo-tienda']);
  const [cine, tienda] = tarjetas(p);
  assert.equal(parte(cine, '.promo-expired').hidden, true);
  assert.equal(parte(tienda, '.promo-expired').hidden, false);
  assert.equal(parte(tienda, '.promo-expired').textContent, 'Vencida');
});

test('H22 entrar de nuevo o cambiar un filtro recalcula y guarda la instantánea nueva', async () => {
  const sesion = almacen();
  guardarInstantanea(sesion, 'A', `/api/para-ti`, respuesta([promo('vieja')]));
  const p = await abrirListado({ sesion, responder: url => respuesta([promo(url.includes('categoria') ? 'filtrada' : 'nueva')]) });
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-nueva']);
  await p.chip('Compras').click();
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-filtrada']);
  assert.deepEqual(p.consultas, [`/api/para-ti`, `/api/para-ti?categoria=Compras`]);
  assert.match(sesion.getItem('los-extras-instantanea:A:todas'), /filtrada/);
});
