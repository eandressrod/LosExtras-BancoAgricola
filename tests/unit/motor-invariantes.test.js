// H22: invariantes del motor (documento «Algoritmo de promociones personalizadas · Beta») sobre el catálogo del esqueleto,
// para cada tarjeta, perfil de prueba y combinación de filtros explícitos.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenarParaTi } from '../../public/js/motor/index.js';
import { motivoNoOrdenable } from '../../public/js/motor/elegibilidad.js';
import { AHORA, PERFILES, ofertasDelCatalogo } from '../fixtures/motor/perfiles.js';

const FILTROS = [{}, { categoria: 'Restaurantes' }, { categoria: 'Entretenimiento' }, { hoy: true }, { comercio: 'pizza' },
  { categoria: 'Supermercados', hoy: true }];
const CASOS = ['basica', 'black'].flatMap(tarjeta => Object.entries(PERFILES).flatMap(([perfil, senales]) =>
  FILTROS.map(filtros => ({ nombre: `${tarjeta} · ${perfil} · ${JSON.stringify(filtros)}`, ofertas: ofertasDelCatalogo(tarjeta), senales, filtros }))));
const cumpleFiltros = (o, { categoria, hoy, comercio }) =>
  (!categoria || o.category === categoria) && (!hoy || o.availableToday) && (!comercio || o.merchant.toLowerCase().includes(comercio));

test('H22 el catálogo de prueba incluye ofertas no elegibles para la tarjeta y fuera de vigencia', () => {
  assert.ok(ofertasDelCatalogo('basica').length < ofertasDelCatalogo('black').length);
  const enEnero = ofertasDelCatalogo('basica', new Date('2027-01-15T18:00:00Z'));
  assert.ok(enEnero.length > 0 && enEnero.every(o => motivoNoOrdenable(o) === 'fuera-de-vigencia'));
  assert.deepEqual(ordenarParaTi({ ofertas: enEnero }).promociones, []);
});

test('H22 nada no elegible aparece y cada oferta aparece una sola vez', () => {
  for (const caso of CASOS) {
    const { promociones } = ordenarParaTi(caso);
    const elegibles = new Set(caso.ofertas.filter(o => motivoNoOrdenable(o) === null).map(o => o.id));
    assert.ok(promociones.every(o => elegibles.has(o.id)), caso.nombre);
    assert.equal(new Set(promociones.map(o => o.id)).size, promociones.length, caso.nombre);
  }
});

test('H22 un perfil vacío devuelve todo lo elegible', () => {
  for (const tarjeta of ['basica', 'black']) {
    const ofertas = ofertasDelCatalogo(tarjeta);
    const respuesta = ordenarParaTi({ ofertas, senales: PERFILES.vacio });
    assert.equal(respuesta.estrategia, 'base');
    assert.deepEqual(respuesta.promociones.map(o => o.id).sort(), ofertas.map(o => o.id).sort(), tarjeta);
  }
});

test('H22 un comercio no elegido nunca supera a uno elegido', () => {
  for (const caso of CASOS) {
    const { promociones } = ordenarParaTi(caso);
    const elegidos = promociones.filter(o => o.componentes.M === 1).map(o => o.componentes.R);
    const otros = promociones.filter(o => o.componentes.M === 0).map(o => o.componentes.R);
    if (elegidos.length && otros.length) assert.ok(Math.min(...elegidos) > Math.max(...otros), caso.nombre);
  }
  const { promociones } = ordenarParaTi({ ofertas: ofertasDelCatalogo('basica'), senales: PERFILES.conComercios });
  assert.equal(promociones[0].componentes.M, 1);
});

test('H22 un filtro explícito nunca se altera: todo resultado lo cumple y una categoría filtrada aparece completa', () => {
  for (const caso of CASOS) {
    const { promociones } = ordenarParaTi(caso);
    assert.ok(promociones.every(o => cumpleFiltros(o, caso.filtros)), caso.nombre);
    if (caso.filtros.categoria) {
      const esperadas = caso.ofertas.filter(o => motivoNoOrdenable(o) === null && cumpleFiltros(o, caso.filtros)).map(o => o.id).sort();
      assert.deepEqual(promociones.map(o => o.id).sort(), esperadas, caso.nombre);
    }
  }
});

test('H22 la misma entrada produce el mismo orden, sin depender del orden recibido', () => {
  for (const caso of CASOS) {
    const orden = ordenarParaTi(caso).promociones.map(o => o.id);
    assert.deepEqual(ordenarParaTi(structuredClone(caso)).promociones.map(o => o.id), orden, caso.nombre);
    assert.deepEqual(ordenarParaTi({ ...caso, ofertas: [...caso.ofertas].reverse() }).promociones.map(o => o.id), orden, caso.nombre);
  }
});

test('H22 toda razón corresponde a un término mayor que cero', () => {
  const termino = { comercio: 'M', categoria: 'C', intencion: 'T' };
  for (const caso of CASOS) {
    for (const promo of ordenarParaTi(caso).promociones) {
      if (promo.razon) assert.ok(promo.componentes[termino[promo.razon.tipo]] > 0, `${caso.nombre} · ${promo.id}`);
    }
  }
});

test('H22 el orden con el catálogo del esqueleto respeta la fecha del motor', () => {
  assert.equal(AHORA.toISOString(), '2026-10-21T18:00:00.000Z');
  const { promociones, estrategia } = ordenarParaTi({ ofertas: ofertasDelCatalogo('basica'), senales: PERFILES.soloCategorias });
  assert.equal(estrategia, 'personalizada');
  assert.ok(promociones.every(o => ['Restaurantes', 'Tecnología'].includes(o.category)));
  assert.ok(promociones.slice(0, 6).some(o => o.category === 'Tecnología') && promociones.slice(0, 6).some(o => o.category === 'Restaurantes'));
});
