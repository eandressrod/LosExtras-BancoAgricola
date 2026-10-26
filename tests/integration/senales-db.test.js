// H22: registro de señales declaradas en la base (migración aditiva, ADR-005).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';

let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, dir), 'utf8'));
});
after(async () => { await db?.close(); });

const insertar = (usuario, clase, ambito, valor, origen = 'encuesta') =>
  db.query('insert into senales_usuario(usuario_id, clase, ambito, valor, origen) values ($1, $2, $3, $4, $5) returning *',
    [usuario, clase, ambito, valor, origen]);

test('H22 la migración copia las categorías de preferencias_usuario como interés·categoría con origen encuesta', async () => {
  const { rows: esperadas } = await db.query(`select usuario_id, unnest(categorias) as valor from preferencias_usuario order by 1, 2`);
  assert.ok(esperadas.length > 0);
  const { rows } = await db.query(`select usuario_id, valor from senales_usuario
    where clase = 'interes' and ambito = 'categoria' and origen = 'encuesta' and activa order by 1, 2`);
  assert.deepEqual(rows, esperadas);
});

test('H22 una señal guarda clase, ámbito, valor, origen, fecha y activa, sin puntajes', async () => {
  const { rows: [fila] } = await insertar('A', 'interes', 'comercio', 'pizza-hut');
  assert.equal(fila.activa, true);
  assert.ok(fila.creada_en instanceof Date && fila.actualizada_en instanceof Date);
  assert.ok(Number(fila.id) > 0);
  const { rows: columnas } = await db.query(`select column_name from information_schema.columns where table_name = 'senales_usuario' order by ordinal_position`);
  assert.deepEqual(columnas.map(c => c.column_name), ['id', 'usuario_id', 'clase', 'ambito', 'valor', 'origen', 'activa', 'creada_en', 'actualizada_en', 'quito_eleccion']);
});

test('H22 la base rechaza combinaciones, orígenes y valores inválidos, y señales repetidas', async () => {
  await assert.rejects(insertar('A', 'interes', 'canal', 'delivery'), e => e.code === '23514');
  await assert.rejects(insertar('A', 'puntaje', 'categoria', 'Compras'), e => e.code === '23514');
  await assert.rejects(insertar('A', 'criterio', 'canal', 'delivery', 'impresion'), e => e.code === '23514');
  await assert.rejects(insertar('A', 'interes', 'categoria', ''), e => e.code === '23514');
  await insertar('A', 'rechazo', 'oferta', 'cine');
  await assert.rejects(insertar('A', 'rechazo', 'oferta', 'cine', 'tarjeta'), e => e.code === '23505');
  await assert.rejects(insertar('sin-perfil', 'interes', 'categoria', 'Compras'), e => e.code === '23503');
});

test('H22 reactivar es actualizar la misma fila y el id permite restaurar respaldos', async () => {
  const { rows: [fila] } = await insertar('B', 'criterio', 'canal', 'presencial');
  await db.query('update senales_usuario set activa = false where id = $1', [fila.id]);
  const { rows: [reactivada] } = await db.query(`insert into senales_usuario(usuario_id, clase, ambito, valor, origen)
    values ('B', 'criterio', 'canal', 'presencial', 'pregunta')
    on conflict (usuario_id, clase, ambito, valor) do update set activa = true, origen = excluded.origen returning *`);
  assert.equal(reactivada.id, fila.id);
  assert.equal(reactivada.origen, 'pregunta');
  await db.query(`insert into senales_usuario(id, usuario_id, clase, ambito, valor, origen) values (900001, 'B', 'interes', 'categoria', 'Salud', 'encuesta')`);
});

test('H22 la tabla es privada del backend y se borra junto con el perfil', async () => {
  for (const rol of ['anon', 'authenticated']) {
    await db.exec('set role ' + rol);
    await assert.rejects(db.query('select * from senales_usuario'), e => e.code === '42501');
    await db.exec('reset role');
  }
  await db.query(`insert into perfiles(id, nombre, tipo_tarjeta) values ('h22-temporal', 'Temporal', 'basica')`);
  await insertar('h22-temporal', 'interes', 'categoria', 'Compras');
  await db.query(`delete from perfiles where id = 'h22-temporal'`);
  const { rows } = await db.query(`select count(*)::integer as filas from senales_usuario where usuario_id = 'h22-temporal'`);
  assert.equal(rows[0].filas, 0);
});
