import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };
let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const f of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(f, dir), 'utf8'));
});
after(async () => { await db?.close(); });
test('catálogo conserva las categorías actuales y permite crear una con varios comercios', async () => {
  const antes = (await db.query('select id from categorias')).rows.map(c => c.id);
  assert.deepEqual(antes.sort(), fuente.categorias.map(c => c.id).sort());
  await db.exec(`
    insert into categorias (id, nombre, imagen_url, orden) values ('Mascotas', 'Mascotas', null, 7);
    insert into comercios (id, nombre, logo_url) values ('mascotas-a', 'mascotas-a', null), ('mascotas-b', 'mascotas-b', null);
    insert into categoria_comercios (categoria_id, comercio_id) values ('Mascotas', 'mascotas-a'), ('Mascotas', 'mascotas-b');`);
  const { rows } = await db.query("select comercio_id from categoria_comercios where categoria_id = 'Mascotas'");
  assert.equal(rows.length, 2);
});
test('preferencias admiten el catálogo dinámico y no referencias inexistentes; una categoría en uso no se borra', async () => {
  await db.query("insert into preferencias_usuario values ('A',array['Mascotas'],true) on conflict (usuario_id) do update set categorias=excluded.categorias");
  await assert.rejects(db.query("update preferencias_usuario set categorias=array['No existe'] where usuario_id='A'"), e => e.code === '23503');
  await assert.rejects(db.query("delete from categorias where id='Mascotas'"), e => e.code === '23503');
});
test('un comercio inexistente no se vincula a una categoría y los visitantes no leen categorías', async () => {
  await assert.rejects(db.query("insert into categoria_comercios (categoria_id, comercio_id) values ('Mascotas', 'inexistente')"), e => e.code === '23503');
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try { await assert.rejects(db.query('select * from categorias'), e => e.code === '42501'); }
    finally { await db.exec('reset role'); }
  }
});
