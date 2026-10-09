import test from 'node:test';
import assert from 'node:assert/strict';

async function crearRepo(respuesta, consultas = []) {
  const { crearRepositorioEstadoEncuestaSupabase } = await import('../../backend/repositorios/estado-encuesta.supabase.js');
  const client = { from(tabla) {
    const consulta = { tabla }; consultas.push(consulta);
    return {
      select(campos) { consulta.campos = campos; return this; },
      eq(campo, valor) { consulta.filtro = [campo, valor]; return this; },
      async maybeSingle() { return respuesta; }
    };
  } };
  return crearRepositorioEstadoEncuestaSupabase(client);
}

test('estado de encuesta consulta usuario_id y el booleano encuesta_completada', async () => {
  const consultas = [];
  const repo = await crearRepo({ data: { encuesta_completada: true }, error: null }, consultas);
  assert.equal(await repo.estaCompletada('A'), true);
  assert.deepEqual(consultas, [{ tabla: 'preferencias_usuario', campos: 'encuesta_completada', filtro: ['usuario_id', 'A'] }]);
});

test('fila pendiente o ausente no se confunde con encuesta completada', async () => {
  for (const data of [null, { encuesta_completada: false }]) {
    assert.equal(await (await crearRepo({ data, error: null })).estaCompletada('A'), false);
  }
});

test('un error de Supabase no se convierte en encuesta pendiente ni revela detalle interno', async () => {
  const repo = await crearRepo({ data: null, error: { message: 'detalle privado', code: '42703' } });
  await assert.rejects(repo.estaCompletada('A'), error => /encuesta/.test(error.message) && !error.message.includes('detalle privado'));
});

test('mock consulta el estado del propietario, sin deducirlo del tipo de tarjeta', async () => {
  const { crearRepositorioEstadoEncuestaMock } = await import('../../backend/repositorios/estado-encuesta.mock.js');
  const repo = crearRepositorioEstadoEncuestaMock({ A: false, B: true });
  assert.equal(await repo.estaCompletada('A'), false);
  assert.equal(await repo.estaCompletada('B'), true);
  assert.equal(await repo.estaCompletada('otro'), false);
});
