// H23: acciones de corrección de cada tarjeta de Para ti, con su estado y su texto de confirmación.
import test from 'node:test';
import assert from 'node:assert/strict';
import { accionesDeOferta, textoConfirmacion } from '../../public/js/correcciones-vista.js';

const OFERTA = { id: 'pizza-hut-miercoles', merchantId: 'pizza-hut', merchant: 'Pizza Hut', category: 'Restaurantes', categoryName: 'Restaurantes' };
const senal = (id, clase, ambito, valor, activa = true) => ({ id, clase, ambito, valor, origen: 'tarjeta', creadaEn: '', activa });

test('H23 cada tarjeta ofrece las tres correcciones y excluir su categoría, todas sin marcar', () => {
  const acciones = accionesDeOferta(OFERTA, []);
  assert.deepEqual(acciones.map(a => [a.tipo, a.texto, a.activa]), [
    ['noMeInteresa', 'No me interesa esta promo', false],
    ['mas', 'Más de este comercio', false],
    ['menos', 'Menos de este comercio', false],
    ['categoria', 'No mostrar Restaurantes', false]
  ]);
  assert.deepEqual(acciones.map(a => a.senal), [
    { clase: 'rechazo', ambito: 'oferta', valor: 'pizza-hut-miercoles', origen: 'tarjeta' },
    { clase: 'interes', ambito: 'comercio', valor: 'pizza-hut', origen: 'tarjeta' },
    { clase: 'rechazo', ambito: 'comercio', valor: 'pizza-hut', origen: 'tarjeta' },
    { clase: 'rechazo', ambito: 'categoria', valor: 'Restaurantes', origen: 'tarjeta' }
  ]);
});

test('H23 una corrección activa queda marcada y conserva el id de su señal para deshacerla en la misma tarjeta', () => {
  const acciones = accionesDeOferta(OFERTA, [senal(4, 'rechazo', 'oferta', OFERTA.id), senal(5, 'interes', 'comercio', 'pizza-hut', false)]);
  assert.deepEqual(acciones.map(a => [a.tipo, a.activa, a.senalId]),
    [['noMeInteresa', true, 4], ['mas', false, null], ['menos', false, null], ['categoria', false, null]]);
});

test('H23 la confirmación dice qué cambió en Para ti', () => {
  assert.equal(textoConfirmacion('noMeInteresa', OFERTA), 'No verás esta promoción en Para ti.');
  assert.equal(textoConfirmacion('mas', OFERTA), 'Verás más de Pizza Hut.');
  assert.equal(textoConfirmacion('menos', OFERTA), 'Verás menos de Pizza Hut.');
  assert.equal(textoConfirmacion('categoria', OFERTA), 'No verás Restaurantes en Para ti.');
  assert.equal(textoConfirmacion('deshacer', OFERTA), 'Se deshizo tu cambio.');
});
