import test from 'node:test';
import assert from 'node:assert/strict';
import { filtrosActivos, textoBotonFiltros } from '../../public/js/filtros-activos.js';

const CATEGORIAS = [{ id: 'Compras', nombre: 'Compras' }, { id: 'Tecnologia', nombre: 'Tecnología' }];
const BLACK = { id: 'cta-a-4', tipoTarjeta: 'black', numeroEnmascarado: '•••• 7754' };

test('sin filtros no hay píldoras', () => {
  assert.deepEqual(filtrosActivos({ categoria: null, categorias: CATEGORIAS, hoy: false, tarjeta: null }), []);
});

test('cada filtro activo es una píldora, en orden fijo: categoría, tarjeta y hoy', () => {
  assert.deepEqual(filtrosActivos({ categoria: 'Tecnologia', categorias: CATEGORIAS, hoy: true, tarjeta: BLACK }), [
    { tipo: 'categoria', texto: 'Tecnología' },
    { tipo: 'tarjeta', texto: 'Black •••• 7754' },
    { tipo: 'hoy', texto: 'Aplica hoy' }
  ]);
});

test('una categoría que ya no está en el catálogo no se muestra', () => {
  assert.deepEqual(filtrosActivos({ categoria: 'Viajes', categorias: CATEGORIAS, hoy: false, tarjeta: null }), []);
});

test('el botón dice cuántos filtros hay activos', () => {
  assert.equal(textoBotonFiltros(0), 'Filtros');
  assert.equal(textoBotonFiltros(1), 'Filtros, 1 activo');
  assert.equal(textoBotonFiltros(3), 'Filtros, 3 activos');
});
