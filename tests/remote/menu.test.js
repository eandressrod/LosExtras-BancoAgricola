import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRepositorioCuentas, obtenerRepositorioEstadoEncuesta } from '../../backend/repositorios/index.js';
import { obtenerClienteSupabase } from '../../backend/config/supabase.js';

test('cuentas reales de A/B/demo están separadas, enmascaradas y propietario sin filas queda vacío', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const repo = obtenerRepositorioCuentas();
  const ids = new Set();
  for (const perfil of ['A', 'B', 'demo']) {
    const cuentas = await repo.listarPorPerfil(perfil);
    assert.ok(cuentas.length > 0);
    for (const cuenta of cuentas) {
      assert.ok(!ids.has(cuenta.id), 'un identificador de cuenta no pertenece a varios perfiles');
      ids.add(cuenta.id);
      assert.match(cuenta.numeroEnmascarado, /[*•]/);
      assert.ok(Number.isFinite(cuenta.saldo));
      assert.ok(cuenta.moneda);
    }
  }
  assert.deepEqual(await repo.listarPorPerfil('perfil-qa-sin-cuentas'), []);
});

test('estado remoto refleja encuesta_completada de cada usuario, no la existencia de la fila', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const repo = obtenerRepositorioEstadoEncuesta();
  const cliente = obtenerClienteSupabase();
  const { data, error } = await cliente.from('preferencias_usuario').select('usuario_id, encuesta_completada');
  assert.equal(error, null);
  const estados = new Map(data.map(fila => [fila.usuario_id, fila.encuesta_completada]));
  for (const usuario of ['A', 'B', 'demo']) {
    assert.equal(await repo.estaCompletada(usuario), estados.get(usuario) === true);
  }
  assert.equal(await repo.estaCompletada('perfil-qa-sin-preferencias'), false);
});
