import test from 'node:test';
import assert from 'node:assert/strict';
import { textoVigencia, condicionesVisibles, textoVencePronto, hoyEnElSalvador, textoOtrasTarjetas, textoDias, estadoDias, pasosDeUso, restriccionesDe } from '../../public/js/promocion-vista.js';

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

test('los días válidos se dicen en una frase, de lunes a domingo', () => {
  assert.equal(textoDias(null), 'Todos los días');
  assert.equal(textoDias([0, 1, 2, 3, 4, 5, 6]), 'Todos los días');
  assert.equal(textoDias([3]), 'Todos los miércoles');
  assert.equal(textoDias([0]), 'Todos los domingos');
  assert.equal(textoDias([0, 6]), 'Sábados y domingos');
  assert.equal(textoDias([4, 1, 2, 3]), 'Lunes a jueves');
  assert.equal(textoDias([5, 6, 0]), 'Viernes a domingo');
  assert.equal(textoDias([1, 3, 5]), 'Lunes, miércoles y viernes');
  assert.equal(textoDias([2, 2]), 'Todos los martes', 'los días repetidos no cambian la frase');
});

test('el aviso de días dice si se puede usar hoy o qué días se puede usar', () => {
  assert.deepEqual(estadoDias({ usageDays: [0, 6], availableToday: true, canUse: true }), { estado: 'hoy', texto: 'Disponible hoy · sábados y domingos' });
  assert.deepEqual(estadoDias({ usageDays: null, availableToday: true, canUse: true }), { estado: 'hoy', texto: 'Disponible hoy · todos los días' });
  assert.deepEqual(estadoDias({ usageDays: [3], availableToday: false, canUse: true }), { estado: 'otro-dia', texto: 'Disponible los miércoles' });
  assert.deepEqual(estadoDias({ usageDays: [0, 6], availableToday: false, canUse: true }), { estado: 'otro-dia', texto: 'Disponible los sábados y domingos' });
  assert.deepEqual(estadoDias({ usageDays: [1, 2, 3, 4], availableToday: false, canUse: true }), { estado: 'otro-dia', texto: 'Disponible de lunes a jueves' });
  assert.deepEqual(estadoDias({ usageDays: [1, 3, 5], availableToday: false, canUse: true }), { estado: 'otro-dia', texto: 'Disponible los lunes, miércoles y viernes' });
});

test('fuera de vigencia el aviso de días es neutro: ni hoy ni otro día', () => {
  assert.deepEqual(estadoDias({ usageDays: [3], availableToday: false, expired: true }), { estado: 'neutro', texto: 'Todos los miércoles' });
  assert.deepEqual(estadoDias({ usageDays: [3], availableToday: false, upcoming: true }), { estado: 'neutro', texto: 'Todos los miércoles' });
  assert.deepEqual(estadoDias({ usageDays: [3], availableToday: true, canUse: true, vencida: true }), { estado: 'neutro', texto: 'Todos los miércoles' });
  assert.deepEqual(estadoDias({ usageDays: null, availableToday: false, canUse: true }), { estado: 'neutro', texto: 'Todos los días' },
    'sin días fijos y sin disponibilidad confirmada no se afirma ningún día');
});

test('los pasos de uso salen de los datos de la promoción, sin inventar condiciones', () => {
  const pasos = pasosDeUso({
    merchant: 'Walmart', channels: ['presencial', 'delivery'], usageDays: [0, 6], validUntil: '2026-12-31',
    applicableCard: 'basica', minimumPurchase: 50, discountCap: 10,
    instructions: 'Paga con tu tarjeta en caja el sábado o el domingo.'
  });
  assert.deepEqual(pasos, [
    { tipo: 'comercio', texto: 'Compra en Walmart, en tienda o a domicilio' },
    { tipo: 'dias', texto: 'Úsala los sábados y domingos, hasta el 31 dic 2026' },
    { tipo: 'tarjeta', texto: 'Paga con tu tarjeta Básica' },
    { tipo: 'monto', texto: 'Compra mínima de $50.00 · descuento hasta $10.00' },
    { tipo: 'nota', texto: 'Paga con tu tarjeta en caja el sábado o el domingo.' }
  ]);
});

test('los pasos de uso omiten lo que la promoción no trae', () => {
  assert.deepEqual(pasosDeUso({ merchant: 'Amazon', channels: ['en-linea'], usageDays: null, applicableCard: 'black' }), [
    { tipo: 'comercio', texto: 'Compra en Amazon, en línea' },
    { tipo: 'dias', texto: 'Úsala cualquier día' },
    { tipo: 'tarjeta', texto: 'Paga con tu tarjeta Black' }
  ]);
  assert.deepEqual(pasosDeUso({ merchant: 'Cine', usageDays: [2], applicableCard: 'basica', minimumPurchase: 15 }).map(paso => paso.texto),
    ['Compra en Cine', 'Úsala los martes', 'Paga con tu tarjeta Básica', 'Compra mínima de $15.00']);
});

test('las condiciones pueden omitir los días cuando la tarjeta ya muestra la tira', () => {
  const promo = { usageDays: [2], minimumPurchase: 10 };
  assert.deepEqual(condicionesVisibles(promo, { dias: false }), ['Compra mínima: $10.00']);
  assert.deepEqual(condicionesVisibles(promo), ['Martes', 'Compra mínima: $10.00']);
});

test('con todas las tarjetas, la otra tarjeta solo se menciona si cambia el beneficio', () => {
  const mejor = { tarjetaId: 'n', tipoTarjeta: 'black', texto: '20 % de descuento' };
  assert.equal(textoOtrasTarjetas({ mejorBeneficio: mejor, otrosBeneficios: [{ tarjetaId: 'b', tipoTarjeta: 'basica', texto: '10 % de descuento' }] }),
    'También 10 % de descuento con tu Básica');
  // Dos Básicas con el mismo beneficio no se repiten, ni se repite la misma tarjeta del mejor beneficio.
  const dosBasicas = { mejorBeneficio: { tarjetaId: 'b1', tipoTarjeta: 'basica', texto: '10 %' }, otrosBeneficios: [{ tarjetaId: 'b2', tipoTarjeta: 'basica', texto: '10 %' }] };
  assert.equal(textoOtrasTarjetas(dosBasicas), '');
  assert.equal(textoOtrasTarjetas({}), '', 'con una tarjeta elegida no hay otros beneficios');
});

test('las restricciones juntan las de la tarjeta y las generales de la promoción, sin repetirse', () => {
  assert.deepEqual(restriccionesDe({ restrictions: 'Entradas de igual precio.', generalRestrictions: 'No aplica a preventas.' }),
    ['Entradas de igual precio.', 'No aplica a preventas.']);
  assert.deepEqual(restriccionesDe({ restrictions: 'Solo artículos seleccionados.', generalRestrictions: 'Solo artículos seleccionados.' }), ['Solo artículos seleccionados.']);
  assert.deepEqual(restriccionesDe({ restrictions: null, generalRestrictions: 'Una compra por transacción.' }), ['Una compra por transacción.']);
  assert.deepEqual(restriccionesDe({}), []);
});

test('el detalle puede dejar las restricciones fuera de las condiciones porque van en «Cómo usarla»', () => {
  const promo = { minimumPurchase: 10, restrictions: 'No acumulable.' };
  assert.deepEqual(condicionesVisibles(promo, { restricciones: false }), ['Compra mínima: $10.00']);
  assert.deepEqual(condicionesVisibles(promo), ['Compra mínima: $10.00', 'No acumulable.']);
});

test('con varias tarjetas, la promoción dice con cuáles de ellas aplica', async () => {
  const { textoAplica } = await import('../../public/js/promocion-vista.js');
  const black = { tarjetaId: 'n', tipoTarjeta: 'black', texto: '20 %' };
  const basica = { tarjetaId: 'b', tipoTarjeta: 'basica', texto: '20 %' };
  assert.deepEqual(textoAplica({ mejorBeneficio: black, otrosBeneficios: [basica] }, 2), { texto: 'Aplica a tus tarjetas Black y Básica', tarjeta: 'ambas' });
  assert.deepEqual(textoAplica({ mejorBeneficio: black, otrosBeneficios: [{ ...basica, texto: '10 %' }] }, 2),
    { texto: 'Aplica a tus tarjetas Black y Básica', tarjeta: 'ambas' }, 'aunque el beneficio cambie, aplica a las dos');
  assert.deepEqual(textoAplica({ mejorBeneficio: black, otrosBeneficios: [] }, 2), { texto: 'Solo con tu tarjeta Black', tarjeta: 'black' });
  assert.deepEqual(textoAplica({ mejorBeneficio: basica, otrosBeneficios: [{ ...basica, tarjetaId: 'b2' }] }, 2),
    { texto: 'Aplica a tus 2 tarjetas Básica', tarjeta: 'basica' });
  assert.deepEqual(textoAplica({ mejorBeneficio: basica, otrosBeneficios: [] }, 1), { texto: 'Aplica a tu tarjeta Básica', tarjeta: 'basica' });
  assert.deepEqual(textoAplica({ applicableCard: 'black' }, 2), { texto: 'Aplica a tu tarjeta Black', tarjeta: 'black' }, 'con una tarjeta elegida en Filtros');
});
