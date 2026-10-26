// H23: última respuesta a cada pregunta en contexto. El mock y Supabase cumplen el mismo contrato (ADR-007).
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRepositorioRespuestasMock, reiniciarRespuestasMock } from '../../backend/repositorios/respuestas-pregunta.mock.js';
import { crearRepositorioRespuestasSupabase } from '../../backend/repositorios/respuestas-pregunta.supabase.js';

const FECHA = new Date('2026-10-26T18:00:00Z');
const respuesta = (valor, valorRespuesta) => ({ pregunta: 'excluir-categoria', valor, respuesta: valorRespuesta });

test('H23 el mock guarda una respuesta por pregunta y valor, con su fecha, y separa a cada usuario', async () => {
  reiniciarRespuestasMock();
  const repo = crearRepositorioRespuestasMock(() => FECHA);
  await repo.guardar('A', respuesta('Restaurantes', 'no'));
  await repo.guardar('A', respuesta('Restaurantes', 'si'));
  assert.deepEqual(await repo.listar('A'), [{ ...respuesta('Restaurantes', 'si'), respondidaEn: FECHA.toISOString() }]);
  assert.deepEqual(await repo.listar('B'), []);
});

test('H23 Supabase hace upsert sobre la clave y lee solo las del propietario', async () => {
  const consultas = [];
  const filas = [{ pregunta: 'excluir-categoria', valor: 'Restaurantes', respuesta: 'no', respondida_en: '2026-10-26T18:00:00+00:00' }];
  const respuestas = [{ data: null, error: null }, { data: filas, error: null }];
  const cliente = { from(tabla) {
    const consulta = { tabla, filtros: [] }; consultas.push(consulta);
    const builder = {
      upsert(datos, opciones) { consulta.upsert = datos; consulta.opciones = opciones; return builder; },
      select(campos) { consulta.campos = campos; return builder; },
      eq(campo, valor) { consulta.filtros.push([campo, valor]); return builder; },
      then(resolver, rechazar) { return Promise.resolve(respuestas.shift()).then(resolver, rechazar); }
    };
    return builder;
  } };
  const repo = crearRepositorioRespuestasSupabase(cliente, () => FECHA);
  await repo.guardar('A', respuesta('Restaurantes', 'no'));
  assert.equal(consultas[0].tabla, 'respuestas_pregunta');
  assert.deepEqual(consultas[0].upsert, { usuario_id: 'A', ...respuesta('Restaurantes', 'no'), respondida_en: FECHA.toISOString() });
  assert.equal(consultas[0].opciones.onConflict, 'usuario_id,pregunta,valor');
  assert.deepEqual(await repo.listar('A'), [{ ...respuesta('Restaurantes', 'no'), respondidaEn: '2026-10-26T18:00:00+00:00' }]);
  assert.deepEqual(consultas[1].filtros, [['usuario_id', 'A']]);
});

test('H23 un error de Supabase en las respuestas se convierte en un error controlado', async () => {
  const cliente = { from() { const b = { select: () => b, eq: () => b, then: (r, x) => Promise.resolve({ data: null, error: { message: 'interno' } }).then(r, x) }; return b; } };
  await assert.rejects(crearRepositorioRespuestasSupabase(cliente).listar('A'), error => error.message === 'No se pudieron consultar tus respuestas.');
});
