// H21 parte 2: marcas de la encuesta por usuario en la base (migración aditiva, ADR-005 y ADR-010).
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
import { crearRepositorioUsuariosPruebaSupabase } from '../../backend/repositorios/usuarios-prueba.supabase.js';

let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(name, dir), 'utf8'));
});
after(async () => { await db?.close(); });

// Cliente mínimo con la forma update().eq().select().maybeSingle() que usa el repositorio.
const cliente = { from(tabla) {
  assert.equal(tabla, 'perfiles');
  let cambios, id, campos;
  return {
    update(datos) { cambios = datos; return this; },
    eq(campo, valor) { assert.equal(campo, 'id'); id = valor; return this; },
    select(lista) { campos = lista; return this; },
    async maybeSingle() {
      const columnas = Object.keys(cambios);
      const { rows } = await db.query(`update public.perfiles set ${columnas.map((c, i) => `${c} = $${i + 2}`).join(', ')}
        where id = $1 returning ${campos}`, [id, ...columnas.map(c => cambios[c])]);
      return { data: rows[0] ?? null, error: null };
    }
  };
} };

test('H21 perfiles guarda «hoja mostrada» y «aviso cerrado» como booleanos obligatorios en falso', async () => {
  const { rows } = await db.query(`select column_name, data_type, is_nullable, column_default from information_schema.columns
    where table_name = 'perfiles' and column_name in ('encuesta_hoja_mostrada', 'encuesta_aviso_cerrado') order by column_name`);
  assert.deepEqual(rows, [
    { column_name: 'encuesta_aviso_cerrado', data_type: 'boolean', is_nullable: 'NO', column_default: 'false' },
    { column_name: 'encuesta_hoja_mostrada', data_type: 'boolean', is_nullable: 'NO', column_default: 'false' }
  ]);
  const { rows: [conteo] } = await db.query('select count(*)::int as marcadas from perfiles where encuesta_hoja_mostrada or encuesta_aviso_cerrado');
  assert.equal(conteo.marcadas, 0);
});

test('H21 el repositorio de Supabase devuelve las marcas, guarda solo la pedida y aísla usuarios', async () => {
  const repo = crearRepositorioUsuariosPruebaSupabase(cliente);
  assert.deepEqual(await repo.marcarApertura('A'), { promocionesAbiertas: true, hojaMostrada: false, avisoCerrado: false });
  assert.deepEqual(await repo.marcarApertura('A', 'hoja-mostrada'), { promocionesAbiertas: true, hojaMostrada: true, avisoCerrado: false });
  assert.deepEqual(await repo.marcarApertura('A', 'aviso-cerrado'), { promocionesAbiertas: true, hojaMostrada: true, avisoCerrado: true });
  assert.deepEqual(await repo.marcarApertura('A'), { promocionesAbiertas: true, hojaMostrada: true, avisoCerrado: true });
  const { rows: [b] } = await db.query("select encuesta_hoja_mostrada, encuesta_aviso_cerrado from perfiles where id = 'B'");
  assert.deepEqual(b, { encuesta_hoja_mostrada: false, encuesta_aviso_cerrado: false });
  assert.equal(await repo.marcarApertura('sin-perfil', 'hoja-mostrada'), null);
});
