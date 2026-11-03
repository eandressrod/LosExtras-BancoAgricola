// SCRUM-131: todos los repositorios se memorizan igual; ninguno se recrea en cada llamada.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as repositorios from '../../backend/repositorios/index.js';

test('SCRUM-131 con DATA_SOURCE=mock cada repositorio devuelve la misma instancia en cada llamada', () => {
  const anterior = process.env.DATA_SOURCE;
  process.env.DATA_SOURCE = 'mock';
  try {
    const obtenedores = Object.entries(repositorios).filter(([nombre, valor]) => nombre.startsWith('obtenerRepositorio') && typeof valor === 'function');
    assert.ok(obtenedores.length >= 8);
    for (const [nombre, obtener] of obtenedores) assert.equal(obtener(), obtener(), nombre);
  } finally {
    if (anterior === undefined) delete process.env.DATA_SOURCE; else process.env.DATA_SOURCE = anterior;
  }
});
