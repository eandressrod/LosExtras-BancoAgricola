import test from 'node:test';
import assert from 'node:assert/strict';
import { leerCategoria, estadoNavegacion, urlConsulta, urlListado, urlDetalle } from '../../public/js/filtro-categoria.js';

test('H5 lee de la URL solo una categoría conocida; lo demás es Todas', () => {
  assert.equal(leerCategoria('?categoria=Compras', null, 'A'), 'Compras');
  for (const search of ['', '?id=tienda', '?categoria=Bancos', '?categoria=compras', '?categoria=', '?categoria=Compras&categoria=Restaurantes']) {
    assert.equal(leerCategoria(search, null, 'A'), null, search);
  }
});

test('H5 el contexto de navegación pertenece a su perfil: otro usuario no lo hereda', () => {
  assert.deepEqual(estadoNavegacion('A', 'Compras'), { perfil: 'A', categoria: 'Compras' });
  assert.equal(leerCategoria('?categoria=Compras', estadoNavegacion('A', 'Compras'), 'A'), 'Compras');
  assert.equal(leerCategoria('?categoria=Compras', estadoNavegacion('A', 'Compras'), 'B'), null);
});

test('H5 la consulta, el detalle y el retorno llevan el mismo filtro', () => {
  assert.equal(urlConsulta(null), '/api/promociones');
  assert.equal(urlConsulta('Compras'), '/api/promociones?categoria=Compras');
  assert.equal(urlDetalle('tienda', 'Compras'), '/detalle.html?id=tienda&categoria=Compras');
  assert.equal(urlDetalle('tienda', null), '/detalle.html?id=tienda');
  assert.equal(urlListado('Compras', 'tienda'), '/promociones.html?categoria=Compras#promo-tienda');
  assert.equal(urlListado(null, 'cine'), '/promociones.html#promo-cine');
  assert.equal(urlListado(null), '/promociones.html');
  const detalle = new URL(urlDetalle('tienda', 'Entretenimiento'), 'http://localhost');
  assert.equal(leerCategoria(detalle.search, null, 'A'), 'Entretenimiento');
});

test('H5 los identificadores se codifican para no romper la URL', () => {
  assert.equal(urlDetalle('a&b c', 'Compras'), '/detalle.html?id=a%26b%20c&categoria=Compras');
  assert.equal(urlListado('Compras', 'a b'), '/promociones.html?categoria=Compras#promo-a%20b');
});
