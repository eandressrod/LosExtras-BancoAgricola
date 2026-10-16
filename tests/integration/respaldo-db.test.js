import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { TABLAS_RESPALDO, TABLAS_EXCLUIDAS, crearFoto, restaurarFoto } from '../../scripts/respaldo-datos.js';

let db;
let migracion;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const carpeta = new URL('../../supabase/migrations/', import.meta.url);
  const archivos = (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort();
  for (const archivo of archivos) await db.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
  migracion = archivos.at(-1).slice(0, 14);
});
after(async () => { await db?.close(); });

const acceso = {
  async leer({ tabla, clave }) {
    const { rows } = await db.query(`select * from public.${tabla} order by ${clave.join(', ')}`);
    return JSON.parse(JSON.stringify(rows));
  },
  async escribir({ tabla, clave }, filas) {
    const columnas = Object.keys(filas[0]);
    const actualizables = columnas.filter(columna => !clave.includes(columna));
    const asignaciones = actualizables.length
      ? `do update set ${actualizables.map(columna => `${columna} = excluded.${columna}`).join(', ')}`
      : 'do nothing';
    await db.query(`insert into public.${tabla} (${columnas.join(', ')})
      select ${columnas.join(', ')} from json_populate_recordset(null::public.${tabla}, $1::json)
      on conflict (${clave.join(', ')}) ${asignaciones}`, [JSON.stringify(filas)]);
  }
};

test('las tablas respaldadas y excluidas cubren todo el esquema public', async () => {
  const { rows } = await db.query("select tablename from pg_tables where schemaname = 'public' order by tablename");
  const cubiertas = [...TABLAS_RESPALDO.map(entrada => entrada.tabla), ...TABLAS_EXCLUIDAS].sort();
  assert.deepEqual(cubiertas, rows.map(fila => fila.tablename));
});

test('el orden de respaldo respeta las llaves foráneas y las claves primarias reales', async () => {
  const posicion = new Map(TABLAS_RESPALDO.map((entrada, indice) => [entrada.tabla, indice]));
  const { rows: foraneas } = await db.query(`select conrelid::regclass::text as tabla, confrelid::regclass::text as referida
    from pg_constraint where contype = 'f' and connamespace = 'public'::regnamespace`);
  for (const { tabla, referida } of foraneas) {
    if (!posicion.has(tabla) || tabla === referida) continue;
    assert.ok(posicion.get(referida) < posicion.get(tabla), `${referida} debe restaurarse antes que ${tabla}`);
  }
  const { rows: primarias } = await db.query(`select c.relname as tabla,
      array_agg(a.attname::text order by array_position(i.indkey::int2[], a.attnum)) as columnas
    from pg_index i join pg_class c on c.oid = i.indrelid
    join pg_attribute a on a.attrelid = c.oid and a.attnum = any(i.indkey)
    where i.indisprimary and c.relnamespace = 'public'::regnamespace group by c.relname`);
  const clave = Object.fromEntries(primarias.map(fila => [fila.tabla, fila.columnas]));
  for (const entrada of TABLAS_RESPALDO) assert.deepEqual(entrada.clave, clave[entrada.tabla], entrada.tabla);
});

test('la foto registra migración y commit, e incluye solo tablas respaldadas', async () => {
  const foto = await crearFoto({ acceso, migracion, commit: 'abc1234', fecha: '2026-10-16T00:00:00.000Z' });
  assert.equal(foto.formato, 1);
  assert.equal(foto.migracion, migracion);
  assert.equal(foto.commit, 'abc1234');
  assert.deepEqual(Object.keys(foto.tablas), TABLAS_RESPALDO.map(entrada => entrada.tabla));
  assert.ok(foto.tablas.perfiles.length > 0);
  for (const excluida of TABLAS_EXCLUIDAS) assert.equal(foto.tablas[excluida], undefined);
});

test('restaurar rechaza una foto de otra migración o formato', async () => {
  const foto = await crearFoto({ acceso, migracion, commit: 'abc1234' });
  await assert.rejects(restaurarFoto({ ...foto, migracion: '20200101000000' }, { acceso, migracionActual: migracion }),
    /migración/);
  await assert.rejects(restaurarFoto({ ...foto, formato: 99 }, { acceso, migracionActual: migracion }), /formato/);
});

test('restaurar simula por defecto y no escribe', async () => {
  const foto = await crearFoto({ acceso, migracion, commit: 'abc1234' });
  await db.query("update public.perfiles set nombre = 'Cambiado' where id = 'A'");
  const resumen = await restaurarFoto(foto, { acceso, migracionActual: migracion });
  assert.equal(resumen.simulado, true);
  assert.ok(resumen.tablas.some(entrada => entrada.tabla === 'perfiles' && entrada.filas > 0));
  const { rows } = await db.query("select nombre from public.perfiles where id = 'A'");
  assert.equal(rows[0].nombre, 'Cambiado');
  await restaurarFoto(foto, { acceso, migracionActual: migracion, simular: false });
});

test('ida y vuelta: restaurar devuelve filas modificadas o eliminadas a su estado de la foto', async () => {
  const foto = await crearFoto({ acceso, migracion, commit: 'abc1234' });
  await db.query("update public.perfiles set nombre = 'Cambiado' where id = 'A'");
  await db.query('delete from public.metas_usuario');
  await db.query('delete from public.tarjetas_usuario');
  const resumen = await restaurarFoto(foto, { acceso, migracionActual: migracion, simular: false });
  assert.equal(resumen.simulado, false);
  const despues = await crearFoto({ acceso, migracion, commit: 'abc1234' });
  assert.deepEqual(despues.tablas, foto.tablas);
});
