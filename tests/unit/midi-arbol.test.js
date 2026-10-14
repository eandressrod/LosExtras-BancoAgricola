import test from 'node:test';
import assert from 'node:assert/strict';
import { limitarAncho, anchoConTecla } from '../../hola/arbol.js';

test('separador limita el árbol y conserva espacio para el panel de datos', () => {
  assert.equal(limitarAncho(215, 1000), 215);
  assert.equal(limitarAncho(20, 1000), 125);
  assert.equal(limitarAncho(900, 1000), 600);
  assert.equal(limitarAncho(600, 500), 260);
  assert.equal(limitarAncho(215, 360), 125);
});

test('separador admite flechas, Home y End mediante teclado', () => {
  assert.equal(anchoConTecla(215, 'ArrowLeft'), 198);
  assert.equal(anchoConTecla(215, 'ArrowRight'), 232);
  assert.equal(anchoConTecla(215, 'Home'), 125);
  assert.equal(anchoConTecla(215, 'End'), 600);
  assert.equal(anchoConTecla(215, 'Tab'), 215);
});
