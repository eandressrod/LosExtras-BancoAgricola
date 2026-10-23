import test from 'node:test';
import assert from 'node:assert/strict';
import { textoVigencia, condicionesVisibles, textoVencePronto, hoyEnElSalvador } from '../../public/js/promocion-vista.js';

test('vigencia viene de la promoción y conserva el día de fecha sin depender de zona horaria del navegador', () => {
  assert.equal(textoVigencia({ validUntil: '2026-11-06' }), 'Válida hasta el 6 nov 2026');
  assert.equal(textoVigencia({ validUntil: '2026-10-08', expired: true }), 'Venció el 8 oct 2026');
  assert.equal(textoVigencia({ validFrom: '2026-10-20', upcoming: true }), 'Disponible desde el 20 oct 2026');
  assert.equal(textoVigencia({}), '');
});

test('solo muestra las condiciones presentes y usa montos en dólares', () => {
  assert.deepEqual(condicionesVisibles({}), []);
  assert.deepEqual(condicionesVisibles({ usageDays: [1,2,3,4], minimumPurchase: 30, discountCap: 25 }), ['Lunes a jueves', 'Compra mínima: $30.00', 'Tope de descuento: $25.00']);
  assert.deepEqual(condicionesVisibles({ usageDays: [0,6], restrictions: 'No acumulable.' }), ['Domingo, sábado', 'No acumulable.']);
});

test('vence pronto solo con 7 días o menos de vigencia, contados desde la fecha civil indicada', () => {
  const hoy = '2026-12-24';
  assert.equal(textoVencePronto({ validUntil: '2026-12-24' }, hoy), 'Vence hoy');
  assert.equal(textoVencePronto({ validUntil: '2026-12-25' }, hoy), 'Vence mañana');
  assert.equal(textoVencePronto({ validUntil: '2026-12-31' }, hoy), 'Vence en 7 días');
  assert.equal(textoVencePronto({ validUntil: '2027-01-01' }, hoy), '');
  assert.equal(textoVencePronto({ validUntil: '2026-12-31' }, '2026-10-23'), '');
});

test('vence pronto no aplica a promociones vencidas, futuras o sin fecha final', () => {
  const hoy = '2026-12-24';
  assert.equal(textoVencePronto({ validUntil: '2026-12-23' }, hoy), '');
  assert.equal(textoVencePronto({ validUntil: '2026-12-26', expired: true }, hoy), '');
  assert.equal(textoVencePronto({ validUntil: '2026-12-26', upcoming: true }, hoy), '');
  assert.equal(textoVencePronto({}, hoy), '');
});

test('la fecha de hoy es la fecha civil de El Salvador, no la del navegador', () => {
  // 03:00 UTC del 1 de noviembre todavía es 31 de octubre en El Salvador (UTC−6).
  assert.equal(hoyEnElSalvador(new Date('2026-11-01T03:00:00Z')), '2026-10-31');
  assert.equal(hoyEnElSalvador(new Date('2026-11-01T06:00:00Z')), '2026-11-01');
});
