import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// H16: las migraciones dejan las tarjetas acordadas como cuentas de tipo tarjeta.
const carpeta = new URL('../../supabase/migrations/', import.meta.url);
let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for (const archivo of (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort()) {
    await db.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
  }
});
after(async () => { await db?.close(); });

test('H16 A tiene Tarjeta Básica y Black, B su Black y demo su Básica, cada una con su dueño', async () => {
  const { rows } = await db.query("select perfil_id, id, segmento, numero_enmascarado from public.cuentas where tipo ilike 'tarjeta%' order by perfil_id, orden");
  assert.deepEqual(rows.map(fila => `${fila.perfil_id} ${fila.id} ${fila.segmento} ${fila.numero_enmascarado}`), [
    'A cta-a-3 Básica •••• 4821', 'A cta-a-4 Black •••• 7754', 'B cta-b-2 Black •••• 0341', 'demo cta-demo-3 Básica •••• 3390'
  ]);
});

test('H16 la migración de tarjetas es aditiva: reaplicarla no duplica ni pisa datos', async () => {
  const archivo = (await readdir(carpeta)).find(nombre => nombre.endsWith('_tarjetas_propias.sql'));
  assert.ok(archivo, 'falta la migración de tarjetas propias');
  await db.query("update public.cuentas set saldo = 1 where id = 'cta-a-4'");
  await db.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
  const { rows } = await db.query("select count(*)::integer as total, max(saldo) as saldo from public.cuentas where id = 'cta-a-4'");
  assert.equal(rows[0].total, 1);
  assert.equal(Number(rows[0].saldo), 1);
});
