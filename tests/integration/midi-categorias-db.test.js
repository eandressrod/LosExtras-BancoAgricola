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
const guardar = async cambios => (await db.query('select public.midi_guardar_cambios($1::jsonb) as datos', [JSON.stringify(cambios)])).rows[0].datos;
test('catálogo conserva las categorías actuales y permite crear una con varios comercios en un lote', async () => {
  const antes = (await db.query('select public.midi_leer_datos() as datos')).rows[0].datos;
  assert.deepEqual(antes.categorias.map(c => c.id).sort(), fuente.categorias.map(c => c.id).sort());
  await db.exec('set role service_role');
  try {
    const datos = await guardar([
      { tabla: 'categoria_comercios', operacion: 'crear', clave: { categoria_id: 'Mascotas', comercio_id: 'mascotas-b' }, datos: { categoria_id: 'Mascotas', comercio_id: 'mascotas-b' } },
      { tabla: 'categorias', operacion: 'crear', clave: { id: 'Mascotas' }, datos: { id: 'Mascotas', nombre: 'Mascotas', imagen_url: null, orden: 7 } },
      ...['mascotas-a', 'mascotas-b'].map(id => ({ tabla: 'comercios', operacion: 'crear', clave: { id }, datos: { id, nombre: id, logo_url: null } })),
      { tabla: 'categoria_comercios', operacion: 'crear', clave: { categoria_id: 'Mascotas', comercio_id: 'mascotas-a' }, datos: { categoria_id: 'Mascotas', comercio_id: 'mascotas-a' } }
    ]);
    assert.equal(datos.categoria_comercios.filter(c => c.categoria_id === 'Mascotas').length, 2);
    assert.ok(datos.categorias.find(c => c.id === 'Mascotas')._version);
  } finally { await db.exec('reset role'); }
});
test('preferencias admiten el catálogo dinámico y no referencias inexistentes; una categoría en uso no se borra', async () => {
  await db.query("insert into preferencias_usuario values ('A',array['Mascotas'],true) on conflict (usuario_id) do update set categorias=excluded.categorias");
  await assert.rejects(db.query("update preferencias_usuario set categorias=array['No existe'] where usuario_id='A'"), e => e.code === '23503');
  await assert.rejects(db.query("delete from categorias where id='Mascotas'"), e => e.code === '23503');
});
test('RPC inválida revierte también el alta de categoría y privilegios no se abren a visitantes', async () => {
  await assert.rejects(guardar([
    { tabla: 'categorias', operacion: 'crear', clave: { id: 'Temporal' }, datos: { id: 'Temporal', nombre: 'Temporal', orden: 0, imagen_url: null } },
    { tabla: 'categoria_comercios', operacion: 'crear', clave: { categoria_id: 'Temporal', comercio_id: 'inexistente' }, datos: { categoria_id: 'Temporal', comercio_id: 'inexistente' } }
  ]), e => e.code === '23503');
  assert.equal((await db.query("select id from categorias where id='Temporal'")).rows.length, 0);
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`set role ${role}`);
    try { await assert.rejects(db.query('select * from categorias'), e => e.code === '42501'); }
    finally { await db.exec('reset role'); }
  }
});
