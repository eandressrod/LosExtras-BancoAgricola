import test from 'node:test';
import assert from 'node:assert/strict';
import { leerHoy, estadoNavegacion, urlConsulta, urlListado, urlDetalle } from '../../public/js/filtro-categoria.js';
import { textoDisponibleHoy } from '../../public/js/promocion-vista.js';

test('H17 Disponibles hoy se lee de la URL solo con hoy=1', () => {
  assert.equal(leerHoy('?hoy=1', null, 'A'), true);
  assert.equal(leerHoy('?categoria=Compras&hoy=1', null, 'A'), true);
  for (const search of ['', '?hoy=0', '?hoy=', '?hoy=true', '?hoy=1&hoy=1', '?categoria=Compras']) {
    assert.equal(leerHoy(search, null, 'A'), false, search);
  }
});

test('H17 otro perfil no hereda Disponibles hoy de la entrada del usuario anterior', () => {
  assert.equal(leerHoy('?hoy=1', estadoNavegacion('A', null), 'A'), true);
  assert.equal(leerHoy('?hoy=1', estadoNavegacion('A', null), 'B'), false);
});

test('H17 la consulta, el detalle y el retorno conservan Disponibles hoy junto con la categoría', () => {
  assert.equal(urlConsulta(null, true), '/api/promociones?hoy=1');
  assert.equal(urlConsulta('Compras', true), '/api/promociones?categoria=Compras&hoy=1');
  assert.equal(urlConsulta('Compras', false), '/api/promociones?categoria=Compras');
  assert.equal(urlListado(null, null, true), '/promociones.html?hoy=1');
  assert.equal(urlListado('Compras', 'tienda', true), '/promociones.html?categoria=Compras&hoy=1#promo-tienda');
  assert.equal(urlDetalle('cine', null, true), '/detalle.html?id=cine&hoy=1');
  assert.equal(urlDetalle('cine', 'Entretenimiento', true), '/detalle.html?id=cine&categoria=Entretenimiento&hoy=1');
  const detalle = new URL(urlDetalle('cine', 'Entretenimiento', true), 'http://localhost');
  assert.equal(leerHoy(detalle.search, null, 'A'), true);
});

test('H17 explica la disponibilidad de hoy sin afirmar que ya se cumple la compra mínima', () => {
  assert.equal(textoDisponibleHoy({ availableToday: false, usageDays: [1, 2, 3, 4] }), '');
  assert.equal(textoDisponibleHoy({}), '');
  assert.equal(textoDisponibleHoy({ availableToday: true, usageDays: null }), 'Disponible hoy: aplica todos los días de su vigencia.');
  assert.equal(textoDisponibleHoy({ availableToday: true, usageDays: [1, 2, 3, 4] }), 'Disponible hoy: es uno de sus días válidos.');
  assert.equal(textoDisponibleHoy({ availableToday: true, usageDays: null, minimumPurchase: 30 }), 'Disponible hoy: aplica todos los días de su vigencia, con la compra mínima indicada.');
});
