import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRepositorioCuentas } from '../../backend/repositorios/index.js';
import { tarjetasPropias, elegirTarjeta } from '../../backend/servicios/tarjetas.js';

// H16 con datos reales (solo lectura). Requiere la migración tarjetas_propias aplicada en Supabase.
test('H16 en Supabase A tiene Básica y Black, B y demo una sola, y nadie puede elegir una tarjeta ajena', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const repo = obtenerRepositorioCuentas();
  const de = {};
  for (const perfil of ['A', 'B', 'demo']) de[perfil] = tarjetasPropias(await repo.listarPorPerfil(perfil));
  assert.deepEqual(de.A.map(tarjeta => tarjeta.tipoTarjeta), ['basica', 'black']);
  assert.deepEqual(de.B.map(tarjeta => tarjeta.tipoTarjeta), ['black']);
  assert.deepEqual(de.demo.map(tarjeta => tarjeta.tipoTarjeta), ['basica']);
  for (const tarjeta of [...de.A, ...de.B, ...de.demo]) assert.match(tarjeta.numeroEnmascarado, /[*•]/);
  for (const ajena of [...de.B, ...de.demo]) {
    assert.deepEqual(elegirTarjeta(de.A, new URLSearchParams({ tarjeta: ajena.id }), 'basica'), { ok: false, motivo: 'ajena' });
  }
});
