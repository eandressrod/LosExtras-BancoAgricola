import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
test('actividad SQL es atómica, no revive vencidas y está restringida al backend', async () => {
  const db = new PGlite();
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls; create table perfiles(id text primary key); insert into perfiles values ('A'); create table sesiones_revocadas(id uuid primary key);");
    await db.exec(await readFile(new URL('../../supabase/migrations/20261015013734_h13_sesion_inactividad.sql', import.meta.url), 'utf8'));
    await db.exec(await readFile(new URL('../../supabase/migrations/20261015014018_h13_actividad_eliminar_perfil.sql', import.meta.url), 'utf8'));
    const id = '00000000-0000-4000-8000-000000000001';
    const query = 'select estado_actividad_sesion($1, $2, clock_timestamp() - interval \'30 seconds\', clock_timestamp() + interval \'2 hours\', $3) as estado';
    const initial = (await db.query(query, [id,'A',false])).rows[0].estado;
    assert.ok(initial.inactivaEn - initial.ahora < 91000);
    const renewed = (await db.query(query, [id,'A',true])).rows[0].estado;
    assert.equal(renewed.inactivaEn - renewed.ahora, 120000);
    await db.query("update sesiones_actividad set ultima_actividad = clock_timestamp() - interval '121 seconds' where id=$1", [id]);
    assert.equal((await db.query(query, [id,'A',true])).rows[0].estado, null);
    assert.equal((await db.query(query, [id,'A',false])).rows[0].estado, null);
    for (const role of ['anon','authenticated']) {
      await db.exec('set role ' + role);
      await assert.rejects(db.query(query,[id,'A',true]), e => e.code === '42501');
      await assert.rejects(db.query('select * from sesiones_actividad'), e => e.code === '42501');
      await db.exec('reset role');
    }
    await db.exec("delete from perfiles where id='A'");
    assert.equal((await db.query('select count(*)::int as total from sesiones_actividad')).rows[0].total,0);
  } finally { await db.close(); }
});
