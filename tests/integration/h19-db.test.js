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

test('H19 TDD: tres perfiles nuevos con productos propios, números únicos y preferencias variadas', async () => {
  const { rows } = await db.query("select p.id,count(t.id)::integer as tarjetas from perfiles p join tarjetas_usuario t on t.perfil_id=p.id where p.id like 'h19-usuario-%' group by p.id order by p.id");
  assert.equal(rows.length, 3);
  assert.ok(rows.every(p => p.tarjetas >= 2 && p.tarjetas <= 4));
  const { rows: cuentas } = await db.query('select id,perfil_id,numero_completo,numero_enmascarado from cuentas where numero_completo is not null');
  assert.equal(new Set(cuentas.map(c => c.numero_completo)).size, cuentas.length);
  assert.ok(cuentas.every(c => /^[1-9]\d{9}$/.test(c.numero_completo)));
  assert.ok(cuentas.every(c => c.numero_enmascarado === '•••• ' + c.numero_completo.slice(-4)));
  const { crearRepositorioCuentasMock } = await import('../../backend/repositorios/cuentas.mock.js');
  for (const perfilId of new Set(cuentas.map(c => c.perfil_id))) {
    const mock = await crearRepositorioCuentasMock().listarPorPerfil(perfilId);
    for (const cuenta of cuentas.filter(c => c.perfil_id === perfilId)) {
      assert.equal(mock.find(c => c.id === cuenta.id).numeroCompleto, cuenta.numero_completo);
    }
  }
  const { rows: estados } = await db.query("select encuesta_completada from preferencias_usuario where usuario_id like 'h19-usuario-%'");
  assert.ok(estados.some(e => e.encuesta_completada) && estados.some(e => !e.encuesta_completada));
  const { rows: originales } = await db.query("select id,saldo from cuentas where id in ('cta-a-1','cta-b-2') order by id");
  assert.deepEqual(originales.map(c => ({ ...c, saldo: Number(c.saldo) })), [{ id: 'cta-a-1', saldo: 30 }, { id: 'cta-b-2', saldo: 1200 }]);
});

test('H19 TDD: nuevas tablas privadas rechazan acceso directo y montos inválidos', async () => {
  for (const rol of ['anon', 'authenticated']) {
    await db.exec('set role ' + rol);
    for (const tabla of ['tarjetas_usuario','puntos_usuario','mensajes_usuario','metas_usuario','productos_tarjeta']) await assert.rejects(db.query('select * from ' + tabla), e => e.code === '42501');
    await db.exec('reset role');
  }
  await assert.rejects(db.query("insert into metas_usuario(id,perfil_id,nombre,objetivo,ahorrado) values('invalida','A','Meta',0,1)"), e => e.code === '23514');
  await assert.rejects(db.query("insert into tarjetas_usuario(id,perfil_id,producto_id,numero_enmascarado,saldo) values('sin-dueno','otro','credito-clasica-visa','•••• 1111',0)"), e => e.code === '23503');
});
