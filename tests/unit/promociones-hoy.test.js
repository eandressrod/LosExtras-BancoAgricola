import test from 'node:test';
import assert from 'node:assert/strict';
import { disponibleHoy, filtrarPromociones, leerDisponibleHoy, filtrarDisponiblesHoy } from '../../backend/promociones.js';

// H17. Fechas controladas: el jueves 15 de octubre de 2026 en El Salvador (UTC-6) va de 06:00Z a 06:00Z del 16.
const JUEVES = new Date('2026-10-15T18:00:00Z');
const VIERNES = new Date('2026-10-16T18:00:00Z');
const DOMINGO = new Date('2026-10-18T18:00:00Z');
const oferta = { id: 'cine', category: 'Entretenimiento', validFrom: '2026-10-09', validUntil: '2026-11-06', usageDays: null };

test('H17 sin restricción de días aplica cualquier día dentro de la vigencia', () => {
  assert.equal(disponibleHoy(oferta, JUEVES), true);
  assert.equal(disponibleHoy(oferta, VIERNES), true);
  assert.equal(disponibleHoy(oferta, DOMINGO), true);
});

test('H17 inicio y fin de vigencia son inclusivos según la fecha civil de El Salvador', () => {
  const empieza = { ...oferta, validFrom: '2026-10-15' };
  assert.equal(disponibleHoy(empieza, new Date('2026-10-15T05:59:59Z')), false);
  assert.equal(disponibleHoy(empieza, new Date('2026-10-15T06:00:00Z')), true);
  const termina = { ...oferta, validUntil: '2026-10-15' };
  assert.equal(disponibleHoy(termina, new Date('2026-10-16T05:59:59Z')), true);
  assert.equal(disponibleHoy(termina, new Date('2026-10-16T06:00:00Z')), false);
});

test('H17 respeta los días permitidos y el cambio de día en El Salvador', () => {
  const lunesAJueves = { ...oferta, usageDays: [1, 2, 3, 4] };
  assert.equal(disponibleHoy(lunesAJueves, JUEVES), true);
  assert.equal(disponibleHoy(lunesAJueves, VIERNES), false);
  assert.equal(disponibleHoy(lunesAJueves, new Date('2026-10-16T05:59:59Z')), true);
  assert.equal(disponibleHoy(lunesAJueves, new Date('2026-10-16T06:00:00Z')), false);
  assert.equal(disponibleHoy({ ...oferta, usageDays: [0] }, DOMINGO), true);
  assert.equal(disponibleHoy({ ...oferta, usageDays: [0] }, JUEVES), false);
});

test('H17 no incluye vencidas ni futuras', () => {
  assert.equal(disponibleHoy({ ...oferta, validFrom: '2026-09-01', validUntil: '2026-10-14' }, JUEVES), false);
  assert.equal(disponibleHoy({ ...oferta, validFrom: '2026-10-16', validUntil: '2026-11-06' }, JUEVES), false);
});

test('H17 una condición temporal faltante o no válida no se confirma como disponible', () => {
  const invalidas = [
    { validFrom: null }, { validUntil: null }, { validFrom: undefined }, { validUntil: '' },
    { validFrom: '2026-02-30' }, { validUntil: '06/11/2026' }, { validFrom: 20261009 },
    { validFrom: '2026-11-07', validUntil: '2026-11-06' },
    { usageDays: [] }, { usageDays: [7] }, { usageDays: [-1] }, { usageDays: ['4'] }, { usageDays: [4.5] }, { usageDays: 'jueves' }
  ];
  for (const cambio of invalidas) assert.equal(disponibleHoy({ ...oferta, ...cambio }, JUEVES), false, JSON.stringify(cambio));
});

test('H17 cada oferta aplicable indica si está disponible hoy sin cambiar su vigencia ni su elegibilidad', () => {
  const catalogo = [
    { ...oferta, id: 'todos', beneficios: [{ tipo_tarjeta: 'basica', beneficio: '10 %', compra_minima: 30 }] },
    { ...oferta, id: 'semana', usageDays: [1, 2, 3, 4], beneficios: [{ tipo_tarjeta: 'basica', beneficio: '2×1' }] },
    { ...oferta, id: 'black', beneficios: [{ tipo_tarjeta: 'black', beneficio: '30 %' }] }
  ];
  const ver = ahora => filtrarPromociones(catalogo, 'basica', [], ahora).map(({ id, availableToday, canUse, minimumPurchase }) => ({ id, availableToday, canUse, minimumPurchase }));
  assert.deepEqual(ver(JUEVES), [
    { id: 'todos', availableToday: true, canUse: true, minimumPurchase: 30 },
    { id: 'semana', availableToday: true, canUse: true, minimumPurchase: null }
  ]);
  assert.deepEqual(ver(VIERNES).map(({ id, availableToday, canUse }) => [id, availableToday, canUse]), [['todos', true, true], ['semana', false, true]]);
});

test('H17 lee el filtro Disponibles hoy: ausente es el listado habitual y solo "1" lo activa', () => {
  assert.deepEqual(leerDisponibleHoy(new URLSearchParams('')), { ok: true, hoy: false });
  assert.deepEqual(leerDisponibleHoy(new URLSearchParams('categoria=Compras')), { ok: true, hoy: false });
  assert.deepEqual(leerDisponibleHoy(new URLSearchParams('hoy=1')), { ok: true, hoy: true });
  for (const consulta of ['hoy=', 'hoy=0', 'hoy=true', 'hoy=1&hoy=1']) {
    assert.deepEqual(leerDisponibleHoy(new URLSearchParams(consulta)), { ok: false }, consulta);
  }
});

test('H17 Disponibles hoy restringe el conjunto aplicable conservando el orden; apagado no lo cambia', () => {
  const lista = [{ id: 'a', availableToday: true }, { id: 'b', availableToday: false }, { id: 'c', availableToday: true }];
  assert.equal(filtrarDisponiblesHoy(lista, false), lista);
  assert.deepEqual(filtrarDisponiblesHoy(lista, true).map(promo => promo.id), ['a', 'c']);
});
