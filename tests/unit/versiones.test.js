import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { validarManifiesto, destinoRegreso, migracionesPendientes, versionDeMigracion } from '../../scripts/versiones.js';

const commit = letra => letra.repeat(40);
const migraciones = ['20261001000000_a.sql', '20261002000000_b.sql', '20261003000000_c.sql'];
const manifiesto = {
  versiones: [
    { pr: 1, commit: commit('a'), migracion: '20261001000000', regreso: false },
    { pr: 2, commit: commit('b'), migracion: '20261002000000', regreso: true }
  ]
};

test('versionDeMigracion toma el prefijo numérico del archivo', () => {
  assert.equal(versionDeMigracion('20261016015547_regenerar_cuentas_tarjetas.sql'), '20261016015547');
});

test('manifiesto válido no produce errores', () => {
  assert.deepEqual(validarManifiesto(manifiesto, migraciones), []);
});

test('manifiesto rechaza migraciones inexistentes, desorden, commits inválidos y regreso discontinuo', () => {
  const errores = validarManifiesto({
    versiones: [
      { pr: 2, commit: commit('b'), migracion: '20261002000000', regreso: true },
      { pr: 1, commit: 'corto', migracion: '20261001000000', regreso: false },
      { pr: 3, commit: commit('c'), migracion: '20260101000000', regreso: true }
    ]
  }, migraciones);
  assert.ok(errores.some(error => error.includes('PR 1') && error.includes('orden')));
  assert.ok(errores.some(error => error.includes('PR 1') && error.includes('commit')));
  assert.ok(errores.some(error => error.includes('PR 3') && error.includes('20260101000000')));
  assert.ok(errores.some(error => error.includes('PR 1') && error.includes('regreso')));
});

test('una versión no puede retroceder de migración respecto a la anterior', () => {
  const errores = validarManifiesto({
    versiones: [
      { pr: 1, commit: commit('a'), migracion: '20261002000000', regreso: false },
      { pr: 2, commit: commit('b'), migracion: '20261001000000', regreso: false }
    ]
  }, migraciones);
  assert.ok(errores.some(error => error.includes('PR 2') && error.includes('migración')));
});

test('destino de regreso es la última versión publicada con regreso habilitado', () => {
  assert.equal(destinoRegreso(manifiesto).pr, 2);
  assert.equal(destinoRegreso({ versiones: [{ ...manifiesto.versiones[0] }] }), null);
});

test('migraciones posteriores a la última versión quedan pendientes de publicar', () => {
  assert.deepEqual(migracionesPendientes(manifiesto, migraciones), ['20261003000000_c.sql']);
});

test('el manifiesto del repositorio es válido y asocia la última migración publicada', async () => {
  const carpeta = new URL('../../supabase/migrations/', import.meta.url);
  const archivos = (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort();
  const real = JSON.parse(await readFile(new URL('../../supabase/versiones.json', import.meta.url), 'utf8'));
  assert.deepEqual(validarManifiesto(real, archivos), []);
  // Sin destino solo durante una transición explícita: el PR que la abre se registra después como nuevo destino.
  assert.ok(destinoRegreso(real) || real.transicion?.motivo?.trim(), 'debe existir una versión destino de regreso o una transición documentada');
});
