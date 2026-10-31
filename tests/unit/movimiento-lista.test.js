import test from 'node:test';
import assert from 'node:assert/strict';
import { desplazamientosLista } from '../../public/js/movimiento-lista.js';

const posiciones = pares => new Map(pares);

test('H21 la vista previa mueve las tarjetas que cambian de lugar y hace aparecer las nuevas (CDA 7)', () => {
  const antes = posiciones([['a', 0], ['b', 300], ['c', 600]]);
  const despues = posiciones([['b', 0], ['a', 300], ['d', 600]]);
  assert.deepEqual(desplazamientosLista(antes, despues), { mover: [{ id: 'b', dy: 300 }, { id: 'a', dy: -300 }], entrar: ['d'] });
});

test('H21 si el conjunto y el orden no cambian no hay animación', () => {
  const misma = posiciones([['a', 0], ['b', 300]]);
  assert.equal(desplazamientosLista(misma, posiciones([['a', 0], ['b', 300]])), null);
  assert.equal(desplazamientosLista(new Map(), new Map()), null);
});

test('H21 la primera vista previa no anima: no hay posiciones anteriores', () => {
  assert.equal(desplazamientosLista(new Map(), posiciones([['a', 0]])), null);
});
