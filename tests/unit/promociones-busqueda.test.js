import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filtrarPromociones,
  filtrarPorCategoria,
  filtrarDisponiblesHoy,
  leerBusquedaComercio,
  filtrarPorComercio
} from '../../backend/promociones.js';
import { catalogoPromociones } from '../../backend/catalogo.js';
import { seleccionarGuardadasVisibles } from '../../backend/servicios/guardadas.js';
import {
  normalizarBusqueda,
  leerBusqueda,
  estadoNavegacion,
  urlConsulta,
  urlListado,
  urlDetalle
} from '../../public/js/filtro-categoria.js';

const JUEVES = new Date('2026-10-15T18:00:00Z');
const VIERNES = new Date('2026-10-16T18:00:00Z');
const ids = lista => lista.map(promo => promo.id);
const aplicables = (tarjeta, intereses = [], fecha = JUEVES) =>
  filtrarPromociones(structuredClone(catalogoPromociones), tarjeta, intereses, fecha);

test('H10 busca por coincidencia parcial del comercio sin distinguir mayúsculas y quitando espacios laterales', () => {
  const base = aplicables('basica');
  assert.deepEqual(ids(filtrarPorComercio(base, 'sim')), ['tienda']);
  assert.deepEqual(ids(filtrarPorComercio(base, 'SIMAN')), ['tienda']);
  assert.deepEqual(ids(filtrarPorComercio(base, '  sImAn  ')), ['tienda']);
  assert.deepEqual(ids(filtrarPorComercio(base, 'mark')), ['cine']);
  assert.deepEqual(ids(filtrarPorComercio(base, 'mcd')), ['restaurante']);
  assert.deepEqual(ids(filtrarPorComercio(base, '  STAR  ')), ['starbucks']);
});

test('H10 borrar el texto o enviar solo espacios restablece el conjunto aplicable sin mutar la lista', () => {
  const base = Object.freeze(aplicables('basica').map(promo => Object.freeze(promo)));
  assert.equal(filtrarPorComercio(base, null), base);
  assert.equal(filtrarPorComercio(base, ''), base);
  assert.equal(filtrarPorComercio(base, '   '), base);
  assert.deepEqual(filtrarPorComercio(base, 'inexistente'), []);
  assert.equal(base.length, 4);
});

test('H10 los resultados son la intersección con tarjeta, intereses, categoría, Disponibles hoy y Guardadas', () => {
  const intereses = ['Restaurantes', 'Compras'];
  const basica = aplicables('basica', intereses, VIERNES);
  const black = aplicables('black', intereses, VIERNES);

  // En Básica no aparece la exclusiva siman-black aunque busque Siman
  assert.deepEqual(ids(filtrarPorComercio(basica, 'siman')), ['tienda']);
  assert.deepEqual(ids(filtrarPorComercio(black, 'siman')), ['tienda', 'siman-black']);

  // Intersección con categoría temporal (H5) y Disponibles hoy (H17)
  assert.deepEqual(ids(filtrarPorComercio(filtrarPorCategoria(black, 'Compras'), 'siman')), ['tienda', 'siman-black']);
  assert.deepEqual(ids(filtrarPorComercio(filtrarPorCategoria(black, 'Restaurantes'), 'siman')), []);
  assert.deepEqual(ids(filtrarPorComercio(filtrarDisponiblesHoy(aplicables('basica', [], VIERNES), true), 'cine')), []);
  assert.deepEqual(ids(filtrarPorComercio(filtrarDisponiblesHoy(aplicables('basica', [], JUEVES), true), 'cine')), ['cine']);

  // Intersección con vista Guardadas (H11/H12)
  const guardadasBlack = seleccionarGuardadasVisibles(filtrarPorComercio(black, 'siman'), ['siman-black', 'restaurante']);
  assert.deepEqual(ids(guardadasBlack.promociones), ['siman-black']);

  // No modifica las preferencias
  assert.deepEqual(intereses, ['Restaurantes', 'Compras']);
});

test('H10 valida el parámetro comercio en la consulta del backend', () => {
  const leer = consulta => leerBusquedaComercio(new URLSearchParams(consulta));
  assert.deepEqual(leer(''), { ok: true, comercio: null });
  assert.deepEqual(leer('comercio='), { ok: true, comercio: null });
  assert.deepEqual(leer('comercio=%20%20%20'), { ok: true, comercio: null });
  assert.deepEqual(leer('comercio=%20%20Siman%20%20'), { ok: true, comercio: 'Siman' });
  assert.deepEqual(leer('comercio=a&comercio=b'), { ok: false });
  assert.deepEqual(leer('comercio=' + 'x'.repeat(101)), { ok: false });
});

test('H10 conserva texto, categoría y hoy en las URLs de consulta, detalle y retorno y limpia al cambiar de perfil', () => {
  assert.equal(normalizarBusqueda('  Siman  '), 'Siman');
  assert.equal(normalizarBusqueda('   '), null);
  assert.equal(leerBusqueda('?comercio=%20Siman%20', estadoNavegacion('A', 'Compras'), 'A'), 'Siman');
  assert.equal(leerBusqueda('?comercio=Siman', estadoNavegacion('A', 'Compras'), 'B'), null);

  assert.equal(urlConsulta('Compras', true, '  Siman '), '/api/promociones?categoria=Compras&hoy=1&comercio=Siman');
  assert.equal(urlDetalle('tienda', 'Compras', true, 'Siman'), '/detalle.html?id=tienda&categoria=Compras&hoy=1&comercio=Siman');
  assert.equal(urlListado('Compras', 'tienda', true, 'Siman'), '/promociones.html?categoria=Compras&hoy=1&comercio=Siman#promo-tienda');
});
