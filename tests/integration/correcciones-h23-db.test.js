// H23: persistencia de las correcciones (migración aditiva, ADR-005). Nada se borra físicamente.
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { TABLAS_RESPALDO } from '../../scripts/respaldo-datos.js';

let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, dir), 'utf8'));
});
after(async () => { await db?.close(); });

const responder = (usuario, valor, respuesta, pregunta = 'excluir-categoria') =>
  db.query(`insert into respuestas_pregunta(usuario_id, pregunta, valor, respuesta) values ($1, $2, $3, $4)
    on conflict (usuario_id, pregunta, valor) do update set respuesta = excluded.respuesta, respondida_en = now() returning *`,
  [usuario, pregunta, valor, respuesta]);

test('H23 un «Menos» guarda si quitó la elección del comercio; por omisión no', async () => {
  const { rows: [normal] } = await db.query(`insert into senales_usuario(usuario_id, clase, ambito, valor, origen)
    values ('A', 'rechazo', 'comercio', 'pizza-hut', 'tarjeta') returning quito_eleccion`);
  assert.equal(normal.quito_eleccion, false);
  const { rows: [quito] } = await db.query(`insert into senales_usuario(usuario_id, clase, ambito, valor, origen, quito_eleccion)
    values ('B', 'rechazo', 'comercio', 'pizza-hut', 'tarjeta', true) returning quito_eleccion`);
  assert.equal(quito.quito_eleccion, true);
});

test('H23 la respuesta a la pregunta en contexto guarda su fecha y se actualiza en lugar de duplicarse', async () => {
  const { rows: [primera] } = await responder('A', 'Restaurantes', 'no');
  assert.ok(primera.respondida_en instanceof Date);
  await responder('A', 'Restaurantes', 'si');
  const { rows } = await db.query(`select respuesta from respuestas_pregunta where usuario_id = 'A' and valor = 'Restaurantes'`);
  assert.deepEqual(rows, [{ respuesta: 'si' }]);
});

test('H23 la base rechaza preguntas, respuestas y perfiles desconocidos', async () => {
  await assert.rejects(responder('A', 'Compras', 'quizas'), e => e.code === '23514');
  await assert.rejects(responder('A', 'Compras', 'no', 'zona'), e => e.code === '23514');
  await assert.rejects(responder('nadie', 'Compras', 'no'), e => e.code === '23503');
  await assert.rejects(responder('A', ' ', 'no'), e => e.code === '23514');
});

test('H23 solo el backend accede a las respuestas y se respaldan con el resto de datos', async () => {
  const { rows: [tabla] } = await db.query(`select relrowsecurity from pg_class where relname = 'respuestas_pregunta'`);
  assert.equal(tabla.relrowsecurity, true);
  const { rows } = await db.query(`select grantee from information_schema.role_table_grants
    where table_name = 'respuestas_pregunta' and grantee in ('anon', 'authenticated')`);
  assert.deepEqual(rows, []);
  assert.ok(TABLAS_RESPALDO.some(entrada => entrada.tabla === 'respuestas_pregunta'));
});
