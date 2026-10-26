import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenarParaTi } from '../../public/js/motor/index.js';
import { CONFIGURACION } from '../../public/js/motor/config.js';

const oferta = (id, merchantId, category, addedOn = '2026-10-10', extra = {}) => ({
  id, merchantId, merchant: merchantId.toUpperCase(), category, categoryName: 'Nombre ' + category, addedOn,
  availableToday: false, canUse: true, benefit: '10 %', applicableCard: 'basica', usageDays: null,
  channels: ['presencial'], benefitType: 'descuento', ...extra
});
const interes = (ambito, valor) => ({ clase: 'interes', ambito, valor, origen: 'encuesta', activa: true });
const criterio = (ambito, valor) => ({ clase: 'criterio', ambito, valor, origen: 'encuesta', activa: true });
const ids = respuesta => respuesta.promociones.map(o => o.id);

test('H22 la respuesta indica la versión de configuración y las ofertas descartadas por el validador', () => {
  const respuesta = ordenarParaTi({ ofertas: [oferta('a', 'm1', 'X'), oferta('b', 'm2', 'X', undefined, { channels: [] })] });
  assert.equal(respuesta.version, CONFIGURACION.version);
  assert.deepEqual(ids(respuesta), ['a']);
  assert.deepEqual(respuesta.descartadas, [{ id: 'b', motivo: 'sin-canal' }]);
  assert.ok(Object.isFrozen(CONFIGURACION) && Object.isFrozen(CONFIGURACION.pesos));
});

test('H22 la estrategia base ordena por alta más reciente con máximo 2 ofertas por comercio entre las primeras 5', () => {
  const respuesta = ordenarParaTi({ ofertas: [
    oferta('a3', 'm1', 'X', '2026-10-18'), oferta('d1', 'm4', 'X', '2026-10-15'), oferta('a1', 'm1', 'X', '2026-10-20'),
    oferta('c1', 'm3', 'Y', '2026-10-16'), oferta('b1', 'm2', 'Y', '2026-10-17'), oferta('a2', 'm1', 'X', '2026-10-19')
  ] });
  assert.equal(respuesta.estrategia, 'base');
  assert.deepEqual(ids(respuesta), ['a1', 'a2', 'b1', 'c1', 'd1', 'a3']);
  for (const promo of respuesta.promociones) {
    assert.equal(promo.razon, null);
    assert.deepEqual(promo.insignias, []);
    assert.deepEqual(promo.componentes, { C: 0, M: 0, T: 0, R: 0 });
  }
});

test('H22 sin alternativas, la estrategia base no esconde ofertas del mismo comercio', () => {
  const respuesta = ordenarParaTi({ ofertas: ['1', '2', '3', '4'].map(n => oferta('a' + n, 'm1', 'X', '2026-10-1' + n)) });
  assert.deepEqual(ids(respuesta), ['a4', 'a3', 'a2', 'a1']);
});

test('H22 los empates se resuelven por aplica hoy, alta más reciente e id', () => {
  const respuesta = ordenarParaTi({ ofertas: [
    oferta('c', 'm3', 'X', '2026-10-15'), oferta('b', 'm2', 'X', '2026-10-15'),
    oferta('z', 'm4', 'X', '2026-10-10', { availableToday: true }), oferta('a', 'm1', 'X', '2026-10-15')
  ], senales: [interes('categoria', 'X')] });
  assert.deepEqual(ids(respuesta), ['z', 'a', 'b', 'c']);
});

test('H22 R = 20·C + 45·M: lo elegido va primero y el alcance suma la categoría del comercio elegido', () => {
  const respuesta = ordenarParaTi({
    ofertas: [oferta('x1', 'm2', 'X', '2026-10-20'), oferta('y1', 'm1', 'Y', '2026-10-01'), oferta('z1', 'm3', 'Z', '2026-10-21'),
      oferta('y2', 'm5', 'Y', '2026-10-21')],
    senales: [interes('categoria', 'X'), interes('comercio', 'm1')]
  });
  assert.equal(respuesta.estrategia, 'personalizada');
  assert.deepEqual(ids(respuesta), ['y1', 'x1', 'y2']);
  const [y1, x1, y2] = respuesta.promociones;
  assert.deepEqual(y1.componentes, { C: 1, M: 1, T: 0, R: 65 });
  assert.deepEqual(x1.componentes, { C: 1, M: 0, T: 0, R: 20 });
  assert.deepEqual(y2.componentes, { C: 0, M: 0, T: 0, R: 0 });
  assert.deepEqual(y1.razon, { tipo: 'comercio', texto: 'Porque elegiste M1' });
  assert.deepEqual(x1.razon, { tipo: 'categoria', texto: 'Por tu interés en Nombre X' });
  assert.equal(y2.razon, null);
});

test('H22 un comercio ya presente entre las primeras 5 resta 20 y no pasa de 2 ofertas allí si hay alternativas pertinentes', () => {
  const respuesta = ordenarParaTi({
    ofertas: [
      oferta('m1a', 'm1', 'Y', '2026-10-20'), oferta('m1b', 'm1', 'Y', '2026-10-19'), oferta('m1c', 'm1', 'Y', '2026-10-18'),
      oferta('m1d', 'm1', 'Y', '2026-10-17'), oferta('x', 'm2', 'X', '2026-10-01'), oferta('xx', 'm3', 'X', '2026-10-02')
    ],
    senales: [interes('categoria', 'X'), interes('comercio', 'm1')]
  });
  assert.deepEqual(ids(respuesta), ['m1a', 'm1b', 'xx', 'x', 'm1c', 'm1d']);
});

test('H22 cada categoría declarada con candidatos aparece entre las primeras 6', () => {
  const recientes = ['1', '2', '3', '4', '5', '6'].map(n => oferta('x' + n, 'mx' + n, 'X', '2026-10-1' + n));
  const respuesta = ordenarParaTi({
    ofertas: [...recientes, oferta('w1', 'mw', 'W', '2026-10-01')],
    senales: [interes('categoria', 'X'), interes('categoria', 'W')]
  });
  assert.deepEqual(ids(respuesta), ['x6', 'x5', 'x4', 'x3', 'x2', 'w1', 'x1']);
});

test('H22 un filtro explícito de categoría restringe y abre esa categoría aunque no esté declarada', () => {
  const ofertas = [oferta('x1', 'm1', 'X'), oferta('z1', 'm2', 'Z', '2026-10-12'), oferta('z2', 'm3', 'Z', '2026-10-11')];
  const respuesta = ordenarParaTi({ ofertas, senales: [interes('categoria', 'X')], filtros: { categoria: 'Z' } });
  assert.deepEqual(ids(respuesta), ['z1', 'z2']);
  assert.ok(respuesta.promociones.every(o => o.razon === null && o.componentes.R === 0));
});

test('H22 Disponibles hoy y la búsqueda por comercio solo restringen el alcance', () => {
  const ofertas = [
    oferta('p1', 'pizza', 'X', '2026-10-12', { merchant: 'Pizza Hut', availableToday: true }),
    oferta('p2', 'pizza', 'X', '2026-10-11', { merchant: 'Pizza Hut' }),
    oferta('c1', 'cine', 'X', '2026-10-13', { merchant: 'Cinemark', availableToday: true }),
    oferta('z1', 'pizzeria', 'Z', '2026-10-13', { merchant: 'Pizzería Z', availableToday: true })
  ];
  const senales = [interes('categoria', 'X')];
  assert.deepEqual(ids(ordenarParaTi({ ofertas, senales, filtros: { hoy: true } })), ['c1', 'p1']);
  assert.deepEqual(ids(ordenarParaTi({ ofertas, senales, filtros: { comercio: ' pIzZa ' } })), ['p1', 'p2']);
  assert.deepEqual(ids(ordenarParaTi({ ofertas, senales, filtros: { comercio: 'pizza', hoy: true } })), ['p1']);
});

test('H22 los estados vacíos distinguen sin catálogo, filtros e intereses', () => {
  const ofertas = [oferta('x1', 'm1', 'X')];
  assert.equal(ordenarParaTi({ ofertas: [] }).vacio, 'sin-catalogo');
  assert.equal(ordenarParaTi({ ofertas: [oferta('v', 'm1', 'X', undefined, { canUse: false })] }).vacio, 'sin-catalogo');
  assert.equal(ordenarParaTi({ ofertas, filtros: { comercio: 'nada' } }).vacio, 'filtros');
  assert.equal(ordenarParaTi({ ofertas, filtros: { categoria: 'Z' } }).vacio, 'filtros');
  assert.equal(ordenarParaTi({ ofertas, senales: [interes('categoria', 'W')] }).vacio, 'intereses');
  assert.equal(ordenarParaTi({ ofertas }).vacio, null);
});

test('H22 los criterios declarados de canal y beneficio son insignias, nunca razón', () => {
  const ofertas = [
    oferta('a', 'm1', 'X', '2026-10-10', { channels: ['presencial', 'delivery'], benefitType: '2x1-combo' }),
    oferta('b', 'm2', 'X', '2026-10-09', { channels: ['en-linea'], benefitType: 'cuotas-sin-intereses' })
  ];
  const senales = [interes('categoria', 'X'), criterio('canal', 'delivery'), criterio('beneficio', '2x1-combo'), criterio('beneficio', 'cuotas-sin-intereses')];
  const [a, b] = ordenarParaTi({ ofertas, senales }).promociones;
  assert.deepEqual(a.insignias, [
    { tipo: 'canal', valor: 'delivery', texto: 'A domicilio' },
    { tipo: 'beneficio', valor: '2x1-combo', texto: '2x1 o combos' }
  ]);
  assert.deepEqual(b.insignias, [{ tipo: 'beneficio', valor: 'cuotas-sin-intereses', texto: 'Cuotas sin intereses' }]);
  assert.equal(a.razon.tipo, 'categoria');
  const indiferente = ordenarParaTi({ ofertas, senales: [interes('categoria', 'X'), criterio('canal', 'indiferente')] });
  assert.ok(indiferente.promociones.every(o => o.insignias.length === 0));
});

test('H22 las reglas de otras historias entran como funciones puras con efecto neutro por defecto', () => {
  const ofertas = [oferta('a', 'm1', 'X', '2026-10-12'), oferta('b', 'm2', 'X', '2026-10-11'), oferta('c', 'm3', 'Y', '2026-10-10')];
  const senales = [interes('categoria', 'X'), interes('categoria', 'Y')];
  assert.deepEqual(ids(ordenarParaTi({ ofertas, senales })), ['a', 'b', 'c']);
  const reglas = {
    excluir: o => o.id === 'b',
    multiplicador: o => (o.merchantId === 'm1' ? 0.3 : 1),
    intencion: o => (o.category === 'Y' ? 1 : 0)
  };
  const respuesta = ordenarParaTi({ ofertas, senales, reglas });
  assert.deepEqual(ids(respuesta), ['c', 'a']);
  const [c, a] = respuesta.promociones;
  assert.deepEqual(c.componentes, { C: 1, M: 0, T: 1, R: 35 });
  assert.deepEqual(a.componentes, { C: 1, M: 0, T: 0, R: 6 });
  assert.equal(c.razon.tipo, 'categoria');
  const soloIntencion = ordenarParaTi({ ofertas: [oferta('z', 'm9', 'Z')], filtros: { categoria: 'Z' }, senales, reglas: { intencion: () => 1 } });
  assert.deepEqual(soloIntencion.promociones[0].razon, { tipo: 'intencion', texto: 'Por lo que buscas hoy' });
});
