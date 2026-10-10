import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { catalogoPromociones } from '../../backend/catalogo.js';

let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const carpeta = new URL('../../supabase/migrations/', import.meta.url);
  for (const archivo of (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
  }
});
after(async () => { await db?.close(); });

test('H4 catálogo de cuatro comercios y cinco promociones con recursos, fechas y descripciones propias', async () => {
  const { rows } = await db.query('select p.*, c.nombre, c.logo_url from promociones p join comercios c on c.id=p.comercio_id order by p.orden');
  assert.equal(rows.length, 5);
  assert.equal(new Set(rows.map(p => p.nombre)).size, 4);
  assert.deepEqual(rows.map(p => p.id), ['restaurante', 'tienda', 'cine', 'starbucks', 'siman-black']);
  for (const p of rows) {
    assert.ok(p.imagen_url.startsWith('/recursos/'));
    assert.ok(p.logo_url.startsWith('/recursos/'));
    assert.ok(p.descripcion_detalle.length > p.description.length);
    assert.equal(p.vigencia_hasta.toISOString().slice(0, 10), '2026-11-06');
  }
});

test('H4 usa beneficios por tarjeta y una exclusiva sin duplicar comercio ni alterar preferencias', async () => {
  const { rows } = await db.query('select promocion_id, tipo_tarjeta, beneficio, compra_minima, tope_descuento from beneficios_tarjeta order by promocion_id, tipo_tarjeta');
  assert.equal(rows.length, 9);
  assert.deepEqual(rows.filter(p => p.promocion_id === 'siman-black').map(p => p.tipo_tarjeta), ['black']);
  assert.notEqual(rows.find(p => p.promocion_id === 'tienda' && p.tipo_tarjeta === 'basica').beneficio, rows.find(p => p.promocion_id === 'tienda' && p.tipo_tarjeta === 'black').beneficio);
  assert.equal((await db.query('select count(*)::int as total from preferencias_usuario')).rows[0].total, 0);
});

test('H4 recursos locales existen y el catálogo mock coincide con el catálogo de la migración', async () => {
  const { rows } = await db.query('select p.id, p.description, p.descripcion_detalle, p.imagen_url, c.logo_url from promociones p join comercios c on c.id=p.comercio_id order by p.orden');
  for (const p of rows) {
    const mock = catalogoPromociones.find(m => m.id === p.id);
    assert.equal(mock.description, p.description);
    assert.equal(mock.detailDescription, p.descripcion_detalle);
    assert.equal(mock.imageUrl, p.imagen_url);
    assert.equal(mock.comercio.logoUrl, p.logo_url);
    for (const recurso of [p.imagen_url, p.logo_url]) {
      assert.ok((await readFile(new URL('../../public' + recurso, import.meta.url))).length > 0);
    }
  }
});

test('H4 permite otro comercio y promoción mediante datos y rechaza fechas/condiciones inválidas', async () => {
  await db.query("insert into comercios (id,nombre) values ('nuevo','Nuevo comercio')");
  await db.query("insert into promociones (id,merchant,category,benefit,description,payment,restrictions,comercio_id) values ('nueva','Nuevo comercio','Compras','10 %','Resumen','Básica','Seleccionados','nuevo')");
  await assert.rejects(db.query("update promociones set vigencia_desde='2026-12-01',vigencia_hasta='2026-11-01' where id='nueva'"), error => error.code === '23514');
  await assert.rejects(db.query("update promociones set dias_uso=array[9]::smallint[] where id='nueva'"), error => error.code === '23514');
  await assert.rejects(db.query("update beneficios_tarjeta set compra_minima=-1 where promocion_id='tienda'"), error => error.code === '23514');
});
