import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarPromociones } from '../../backend/promociones.js';

const fecha = new Date('2026-10-09T18:00:00Z');
const oferta = {
  id: 'compras', merchant: 'Anterior', category: 'Compras', description: 'Resumen',
  detailDescription: 'Una descripción más completa.', validFrom: '2026-10-09', validUntil: '2026-11-06',
  imageUrl: '/recursos/promociones/compras.jpg', imageAlt: 'Ropa', usageDays: [1, 2, 3, 4],
  comercio: { nombre: 'Siman', logoUrl: '/recursos/comercios/siman.svg' },
  beneficios: [
    { tipo_tarjeta: 'basica', beneficio: '15 %', medio_pago: 'Básica', restricciones: 'Seleccionados', compra_minima: 30, tope_descuento: 15 },
    { tipo_tarjeta: 'black', beneficio: '25 %', medio_pago: 'Black', restricciones: 'Seleccionados', compra_minima: 30, tope_descuento: 25 }
  ]
};

test('H4 resuelve comercio, tarjeta y condiciones sin exponer las variantes de otro perfil', () => {
  const [promo] = filtrarPromociones([oferta], 'black', ['Compras'], fecha);
  assert.equal(promo.merchant, 'Siman');
  assert.equal(promo.applicableCard, 'black');
  assert.equal(promo.exclusive, false);
  assert.equal(promo.minimumPurchase, 30);
  assert.equal(promo.discountCap, 25);
  assert.equal(promo.logoUrl, '/recursos/comercios/siman.svg');
  assert.equal(promo.detailDescription, oferta.detailDescription);
  assert.equal(promo.beneficios, undefined);
  assert.equal(promo.comercio, undefined);
});

test('H4 distingue una Black exclusiva de un beneficio mejorado del mismo comercio', () => {
  const exclusiva = { ...oferta, beneficios: [oferta.beneficios[1]] };
  assert.deepEqual(filtrarPromociones([exclusiva], 'basica', [], fecha), []);
  assert.equal(filtrarPromociones([exclusiva], 'black', [], fecha)[0].exclusive, true);
  assert.equal(filtrarPromociones([oferta], 'black', [], fecha)[0].exclusive, false);
});

test('H4 vigencia inclusiva usa la fecha de El Salvador, no el cambio de día UTC', () => {
  const ver = ahora => filtrarPromociones([oferta], 'basica', [], new Date(ahora))[0];
  assert.equal(ver('2026-10-09T05:59:59Z').upcoming, true);
  assert.equal(ver('2026-10-09T06:00:00Z').canUse, true);
  assert.equal(ver('2026-11-07T05:59:59Z').expired, false);
  assert.equal(ver('2026-11-07T06:00:00Z').expired, true);
  assert.equal(ver('2026-11-07T06:00:00Z').canUse, false);
});

test('H4 no inventa mínimos/topes ausentes ni elimina vencidas sin identificarlas', () => {
  const [promo] = filtrarPromociones([{ ...oferta, validUntil: '2026-10-08', beneficios: [{ tipo_tarjeta: 'basica', beneficio: '10 %' }] }], 'basica', [], fecha);
  assert.equal(promo.minimumPurchase, null);
  assert.equal(promo.discountCap, null);
  assert.equal(promo.expired, true);
  assert.equal(promo.canUse, false);
});
