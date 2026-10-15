import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrarPromociones, filtrarPorCategoria, leerCategoriaTemporal } from '../../backend/promociones.js';
import { catalogoPromociones } from '../../backend/catalogo.js';

// H5: el filtro temporal se aplica sobre lo que ya corresponde a la tarjeta y a los intereses.
const ids = lista => lista.map(promo => promo.id);
const aplicables = (tarjeta, intereses = []) => filtrarPromociones(structuredClone(catalogoPromociones), tarjeta, intereses);

test('H5 la categoría restringe el conjunto aplicable y conserva su orden', () => {
  const todas = aplicables('basica');
  assert.deepEqual(ids(filtrarPorCategoria(todas, 'Restaurantes')), ['restaurante', 'starbucks']);
  assert.deepEqual(ids(filtrarPorCategoria(todas, 'Compras')), ['tienda']);
  assert.deepEqual(ids(filtrarPorCategoria(todas, 'Entretenimiento')), ['cine']);
});

test('H5 Todas quita solo el filtro temporal: devuelve el mismo conjunto aplicable', () => {
  const todas = aplicables('black', ['Compras', 'Entretenimiento']);
  assert.deepEqual(filtrarPorCategoria(todas, null), todas);
  assert.deepEqual(ids(todas), ['tienda', 'cine', 'siman-black']);
});

test('H5 con varias categorías de interés el filtro no amplía los intereses', () => {
  const intereses = ['Restaurantes', 'Compras'];
  const lista = aplicables('basica', intereses);
  assert.deepEqual(ids(filtrarPorCategoria(lista, 'Compras')), ['tienda']);
  assert.deepEqual(filtrarPorCategoria(lista, 'Entretenimiento'), []);
  assert.deepEqual(intereses, ['Restaurantes', 'Compras']);
});

test('H5 con la encuesta omitida filtra las ofertas aplicables del perfil', () => {
  assert.deepEqual(ids(filtrarPorCategoria(aplicables('basica', []), 'Entretenimiento')), ['cine']);
});

test('H5 el filtro no introduce ofertas de otra tarjeta', () => {
  assert.deepEqual(ids(filtrarPorCategoria(aplicables('basica'), 'Compras')), ['tienda']);
  assert.deepEqual(ids(filtrarPorCategoria(aplicables('black'), 'Compras')), ['tienda', 'siman-black']);
});

test('H5 filtrar no modifica la lista recibida', () => {
  const lista = Object.freeze(aplicables('basica').map(promo => Object.freeze(promo)));
  assert.equal(filtrarPorCategoria(lista, 'Compras').length, 1);
  assert.equal(lista.length, 4);
});

test('H5 valida contra las categorías vigentes del catálogo, no contra una lista fija', () => {
  const vigentes = new Set(['Restaurantes', 'Compras', 'Viajes']);
  const leer = consulta => leerCategoriaTemporal(new URLSearchParams(consulta), vigentes);
  assert.deepEqual(leer('categoria=Viajes'), { ok: true, categoria: 'Viajes' });
  assert.deepEqual(leer('categoria=Entretenimiento'), { ok: false });
});

test('H5 valida la categoría pedida: sin parámetro es Todas; desconocida, repetida o vacía se rechaza', () => {
  const leer = consulta => leerCategoriaTemporal(new URLSearchParams(consulta));
  assert.deepEqual(leer(''), { ok: true, categoria: null });
  assert.deepEqual(leer('categoria=Compras'), { ok: true, categoria: 'Compras' });
  for (const invalida of ['categoria=Bancos', 'categoria=compras', 'categoria=Todas', 'categoria=', 'categoria=Compras&categoria=Restaurantes']) {
    assert.deepEqual(leer(invalida), { ok: false }, invalida);
  }
});
