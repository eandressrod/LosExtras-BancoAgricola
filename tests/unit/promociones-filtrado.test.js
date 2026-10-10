import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarPromociones } from '../../backend/promociones.js';

const catalogo = [
  { id: 'uno', category: 'Compras', beneficios: [
    { tipo_tarjeta: 'basica', beneficio: '10 %', medio_pago: 'Débito', restricciones: 'Una compra' },
    { tipo_tarjeta: 'black', beneficio: '20 %', medio_pago: 'Crédito', restricciones: 'Dos compras' }
  ] },
  { id: 'dos', category: 'Restaurantes', beneficios: [
    { tipo_tarjeta: 'black', beneficio: '15 %', medio_pago: 'Crédito', restricciones: 'Una compra' }
  ] }
];

test('tarjeta y categorías eligen solo ofertas elegibles y su beneficio correspondiente', () => {
  const lista = filtrarPromociones(catalogo, 'basica', ['Compras']);
  assert.deepEqual(lista.map(({ id, category, benefit, payment, restrictions }) => ({ id, category, benefit, payment, restrictions })), [{ id: 'uno', category: 'Compras', benefit: '10 %', payment: 'Débito', restrictions: 'Una compra' }]);
  assert.equal(filtrarPromociones(catalogo, 'black', ['Compras'])[0].benefit, '20 %');
  assert.deepEqual(filtrarPromociones(catalogo, 'basica', ['Restaurantes']), []);
});

test('sin categorías muestra todas las ofertas de la tarjeta; sin beneficio no inventa elegibilidad', () => {
  assert.equal(filtrarPromociones(catalogo, 'black', []).length, 2);
  assert.deepEqual(filtrarPromociones([{ id: 'sin-beneficio', category: 'Compras' }], 'basica', []), []);
});
