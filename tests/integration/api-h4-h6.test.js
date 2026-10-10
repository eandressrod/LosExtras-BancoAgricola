import test from 'node:test';
import assert from 'node:assert/strict';
import promociones from '../../api/promociones.js';
import detalle from '../../api/promocion.js';
import preferencias from '../../api/preferencias.js';
import { crearToken } from '../../backend/servicios/sesion.js';
import { crearRepositorioSupabase } from '../../backend/repositorios/supabase.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h4-pruebas-de-integracion'.repeat(2);
const headers = id => ({ cookie: `sesion_extras=${crearToken(id)}` });
const request = (ruta, id, extra = {}) => new Request('http://localhost' + ruta, { ...extra, headers: { ...headers(id), ...extra.headers } });

test('H4 encuesta omitida muestra cuatro ofertas Básica y cinco Black; el cliente no cambia tarjeta', async () => {
  const a = await promociones.fetch(request('/api/promociones?usuario_id=B&tipoTarjeta=black', 'A'));
  const b = await promociones.fetch(request('/api/promociones?usuario_id=A&tipoTarjeta=basica', 'B'));
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  const basica = await a.json(); const black = await b.json();
  assert.equal(basica.length, 4); assert.equal(black.length, 5);
  assert.ok(basica.every(p => p.applicableCard === 'basica' && !p.exclusive));
  assert.equal(black.find(p => p.id === 'siman-black').exclusive, true);
  assert.notEqual(basica[0].benefit, black[0].benefit);
  assert.ok(black.every(p => !p.beneficios && !p.comercio));
});

test('H4 detalle coincide con tarjeta y beneficio del listado y rechaza una exclusiva ajena', async () => {
  assert.equal((await detalle.fetch(request('/api/promocion?id=siman-black&tipoTarjeta=black', 'A'))).status, 404);
  assert.equal((await detalle.fetch(new Request('http://localhost/api/promocion?id=tienda'))).status, 401);
  for (const id of ['A','B']) {
    const lista = await (await promociones.fetch(request('/api/promociones', id))).json();
    for (const promo of lista) {
      assert.deepEqual(await (await detalle.fetch(request('/api/promocion?id=' + promo.id, id))).json(), promo);
      assert.ok(promo.detailDescription.length > promo.description.length);
    }
  }
});

test('H6 edita las categorías del dueño y el próximo listado refleja cambios sin alterar al otro usuario', async () => {
  const guardar = (id, categorias) => preferencias.fetch(request('/api/preferencias', id, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ categorias, usuario_id: 'B' }) }));
  assert.equal((await guardar('A', ['Restaurantes'])).status, 200);
  assert.equal((await guardar('A', ['Compras'])).status, 200);
  const preferenciasA = await (await preferencias.fetch(request('/api/preferencias?usuario_id=B', 'A'))).json();
  const preferenciasB = await (await preferencias.fetch(request('/api/preferencias', 'B'))).json();
  assert.deepEqual(preferenciasA.categories, ['Compras']);
  assert.equal(preferenciasB.completed, false);
  const lista = await (await promociones.fetch(request('/api/promociones', 'A'))).json();
  assert.deepEqual(lista.map(p => p.id), ['tienda']);
  assert.equal((await guardar('A', [])).status, 400);
  assert.deepEqual((await (await preferencias.fetch(request('/api/preferencias', 'A'))).json()).categories, ['Compras']);
});

test('repositorio Supabase pide relaciones/recursos en una consulta y no oculta errores', async () => {
  let consulta; let error = null;
  const fixture = [{ id: 'promocion-nueva', merchant: 'Nuevo comercio', beneficios: [] }];
  const client = { from(tabla) {
    assert.equal(tabla, 'promociones');
    return { select(campos) { consulta = campos; return this; }, order() { return this; }, then(resolve) { return Promise.resolve({ data: fixture, error }).then(resolve); } };
  } };
  const repo = crearRepositorioSupabase(client);
  assert.deepEqual(await repo.listarPromocionesConBeneficios(), fixture);
  assert.match(consulta, /comercios\(nombre, logoUrl:logo_url\)/);
  assert.match(consulta, /compra_minima, tope_descuento/);
  error = { message: 'Error interno' };
  await assert.rejects(repo.listarPromocionesConBeneficios(), /consultar los beneficios/);
});
