import test from 'node:test';
import assert from 'node:assert/strict';
import { idsVisiblesGuardadas, cuentaEnGuardadas } from '../../public/js/guardar-promo.js';

test('el contador usa las guardadas visibles y deja en ids las que ocultan la tarjeta o los intereses', () => {
  const datos = {
    ids: ['tienda', 'dominos-lunes'],
    promociones: [{ id: 'dominos-lunes' }]
  };
  assert.deepEqual(idsVisiblesGuardadas(datos), ['dominos-lunes']);
  assert.deepEqual(idsVisiblesGuardadas({ ids: ['tienda'], promociones: [] }), []);
  assert.deepEqual(idsVisiblesGuardadas({}), []);
});

test('una guardada cuenta si se puede usar y su categoría está entre los intereses declarados', () => {
  const restaurante = { id: 'dominos-lunes', category: 'Restaurantes', canUse: true };
  const tienda = { id: 'tienda', category: 'Compras', canUse: true };
  const vencida = { id: 'cine', category: 'Restaurantes', canUse: false };
  assert.equal(cuentaEnGuardadas(restaurante, ['Restaurantes']), true);
  assert.equal(cuentaEnGuardadas(tienda, ['Restaurantes']), false);
  assert.equal(cuentaEnGuardadas(vencida, ['Restaurantes']), false);
  assert.equal(cuentaEnGuardadas(tienda, []), true);
});
