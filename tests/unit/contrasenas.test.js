import test from 'node:test';
import assert from 'node:assert/strict';
import { generarHash, verificarContrasena } from '../../backend/servicios/contrasenas.js';

test('el hash no contiene la contraseña y verifica la correcta', () => {
  const h = generarHash('Secreta123');
  assert.ok(!h.includes('Secreta123'));
  assert.equal(verificarContrasena('Secreta123', h), true);
});

test('rechaza contraseña incorrecta y entradas inválidas', () => {
  const h = generarHash('Secreta123');
  assert.equal(verificarContrasena('otra', h), false);
  assert.equal(verificarContrasena(undefined, h), false);
  assert.equal(verificarContrasena('x', 'sin-formato'), false);
});
