import test from 'node:test';
import assert from 'node:assert/strict';
import { diapositivasFranja, textoDias, diaDeLaSemana } from '../../public/js/franja.js';

// Viernes 23 de octubre de 2026.
const HOY = '2026-10-23';
const promo = (id, extra = {}) => ({
  id, merchant: id, benefit: 'Beneficio ' + id, categoryName: 'Compras', validUntil: '2026-12-31', availableToday: true, razon: null, ...extra
});
const tipos = lista => lista.map(diapositiva => diapositiva.tipo);

test('el día de la semana sale de la fecha civil, sin depender de la zona del navegador', () => {
  assert.equal(diaDeLaSemana('2026-10-23'), 5);
  assert.equal(diaDeLaSemana('2026-10-25'), 0);
});

test('los días fijos se escriben como en un aviso semanal', () => {
  assert.equal(textoDias([2]), 'Los martes');
  assert.equal(textoDias([6]), 'Los sábados');
  assert.equal(textoDias([1, 2, 3, 4]), 'De lunes a jueves');
  assert.equal(textoDias([5, 6, 0]), 'De viernes a domingo');
  assert.equal(textoDias([6, 0]), 'Sábados y domingos');
  assert.equal(textoDias([1, 3]), 'Lunes y miércoles');
});

test('con la que más ahorras hoy compara solo topes de lo que aplica hoy y prefiere los intereses declarados', () => {
  const promociones = [
    promo('siman', { discountCap: 30, minimumPurchase: 50 }),
    promo('starbucks', { discountCap: 15, minimumPurchase: 10, razon: { tipo: 'categoria', texto: 'Por tu interés en Restaurantes' } }),
    promo('walmart', { discountCap: 40, availableToday: false, usageDays: [6, 0] })
  ];
  const [ahorro] = diapositivasFranja({ promociones, hoy: HOY, estrategia: 'personalizada' });
  assert.equal(ahorro.tipo, 'ahorro');
  assert.equal(ahorro.titulo, 'Hoy puedes ahorrar hasta $15 en starbucks');
  assert.equal(ahorro.detalle, 'Compra mínima $10 · Beneficio starbucks');
  assert.deepEqual(ahorro.accion, { tipo: 'promo', id: 'starbucks' });

  const sinIntereses = diapositivasFranja({ promociones, hoy: HOY, estrategia: 'base' });
  assert.equal(sinIntereses.find(d => d.tipo === 'ahorro').accion.id, 'siman', 'sin intereses compara todo lo que aplica hoy');
});

test('hoy toca anuncia una promoción de día fijo que aplica hoy y el aviso de la semana una que no', () => {
  const promociones = [
    promo('payless', { usageDays: [5, 6, 0] }),
    promo('campero', { usageDays: [2], availableToday: false, benefit: '2×1 en combos personales', merchant: 'Pollo Campero' })
  ];
  const lista = diapositivasFranja({ promociones, hoy: HOY, estrategia: 'base' });
  const hoyToca = lista.find(d => d.tipo === 'hoy-toca');
  assert.equal(hoyToca.titulo, 'Hoy viernes: payless');
  assert.deepEqual(hoyToca.accion, { tipo: 'promo', id: 'payless' });
  const semana = lista.find(d => d.tipo === 'semana');
  assert.equal(semana.titulo, 'Los martes en Pollo Campero');
  assert.equal(semana.detalle, '2×1 en combos personales');
  assert.deepEqual(semana.accion, { tipo: 'detalle', id: 'campero' });
});

test('el orden explica sus intereses con los nombres de las razones, o la estrategia base', () => {
  const promociones = [
    promo('cine', { merchant: 'Cinemark', razon: { tipo: 'comercio', texto: 'Porque elegiste Cinemark' } }),
    promo('starbucks', { categoryName: 'Restaurantes', razon: { tipo: 'categoria', texto: 'Por tu interés en Restaurantes' } }),
    promo('campero', { categoryName: 'Restaurantes', razon: { tipo: 'categoria', texto: 'Por tu interés en Restaurantes' } })
  ];
  const orden = diapositivasFranja({ promociones, hoy: HOY, estrategia: 'personalizada' }).find(d => d.tipo === 'orden');
  assert.equal(orden.titulo, 'Ordenadas por tus intereses');
  assert.equal(orden.detalle, 'Cinemark y Restaurantes');
  assert.deepEqual(orden.accion, { tipo: 'ir', destino: '/preferencias.html', etiqueta: 'Editar' });

  const base = diapositivasFranja({ promociones: [promo('a')], hoy: HOY, estrategia: 'base' }).find(d => d.tipo === 'orden');
  assert.equal(base.titulo, 'Ordenadas por las más recientes');
  assert.equal(base.accion.etiqueta, 'Personalizar');
});

test('la encuesta no se ofrece en la franja: la hoja y el aviso de la lista ya la ofrecen (ADR-010)', () => {
  const lista = diapositivasFranja({ promociones: [promo('a')], hoy: HOY, estrategia: 'base', encuestaPendiente: true });
  assert.equal(tipos(lista).includes('encuesta'), false);
});

test('guardadas y vence pronto solo aparecen con datos reales', () => {
  const promociones = [promo('a', { validUntil: '2026-10-26' }), promo('b')];
  const lista = diapositivasFranja({ promociones, hoy: HOY, estrategia: 'base', guardadas: ['b'] });
  const vence = lista.find(d => d.tipo === 'vence');
  assert.equal(vence.titulo, 'a: vence en 3 días');
  assert.deepEqual(vence.accion, { tipo: 'promo', id: 'a' });
  const guardadas = lista.find(d => d.tipo === 'guardadas');
  assert.equal(guardadas.titulo, 'Tienes 1 promoción guardada');
  assert.deepEqual(guardadas.accion, { tipo: 'ir', destino: '/guardadas.html', etiqueta: 'Ver' });

  const sinDatos = diapositivasFranja({ promociones: [promo('b')], hoy: HOY, estrategia: 'base', guardadas: [] });
  assert.deepEqual(tipos(sinDatos), ['orden']);
});

test('nunca pasan de cinco diapositivas, siguen la prioridad y sin promociones no hay franja', () => {
  const promociones = [
    promo('venc', { validUntil: '2026-10-25' }),
    promo('tope', { discountCap: 10 }),
    promo('fijo', { usageDays: [5] }),
    promo('martes', { usageDays: [2], availableToday: false }),
    promo('guard')
  ];
  const lista = diapositivasFranja({ promociones, hoy: HOY, estrategia: 'base', guardadas: ['guard'] });
  assert.deepEqual(tipos(lista), ['vence', 'ahorro', 'hoy-toca', 'semana', 'guardadas']);
  assert.deepEqual(diapositivasFranja({ promociones: [], hoy: HOY, estrategia: 'base' }), []);
});

test('la misma entrada produce las mismas diapositivas', () => {
  const entrada = { promociones: [promo('a', { discountCap: 5 }), promo('b', { discountCap: 5 })], hoy: HOY, estrategia: 'base' };
  assert.deepEqual(diapositivasFranja(entrada), diapositivasFranja(entrada));
  assert.equal(diapositivasFranja(entrada)[0].accion.id, 'a', 'el empate respeta el orden de la lista');
});
