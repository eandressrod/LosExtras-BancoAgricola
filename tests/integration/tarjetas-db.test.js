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

test('H16 A tiene Básica y Black y ambas pertenecen a cuentas de A',async()=>{
 const {rows}=await db.query("select id,cuenta_id,tipo_tarjeta from tarjetas_usuario where perfil_id='A' order by orden");
 assert.deepEqual(rows,[{id:'cta-a-3',cuenta_id:'cta-a-1',tipo_tarjeta:'basica'},{id:'cta-a-4',cuenta_id:'cta-a-2',tipo_tarjeta:'black'}]);
});
test('no se pueden volver a insertar tarjetas dentro de cuentas',async()=>{
 await assert.rejects(db.query("insert into cuentas(id,perfil_id,nombre,tipo,numero_completo,numero_enmascarado) values('invalida','A','Black','Tarjeta de Crédito','1234567890','1234567890')"),e=>e.code==='23514');
});
