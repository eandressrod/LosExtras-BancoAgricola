import test from 'node:test';
import assert from 'node:assert/strict';
import { textoVigencia, condicionesVisibles } from '../../public/js/promocion-vista.js';

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
