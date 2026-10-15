import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { generarPerfil, crearBorrador } from '../../hola/modelo.js';
import { generarHash, verificarContrasena } from '../../backend/servicios/contrasenas.js';

let db;
before(async () => {
  db = new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  const dir = new URL('../../supabase/migrations/', import.meta.url);
  for (const f of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) await db.exec(await readFile(new URL(f, dir), 'utf8'));
});
after(async () => { await db?.close(); });
async function leer() { return (await db.query('select public.midi_leer_datos() as datos')).rows[0].datos; }
async function guardar(cambios) { return (await db.query('select public.midi_guardar_cambios($1::jsonb) as datos', [JSON.stringify(cambios)])).rows[0].datos; }
function cambiosPerfil(filas) {
  const b = crearBorrador(); b.agregar(filas);
  return b.cambios().map(c => c.tabla === 'perfiles' ? { ...c, datos: { ...Object.fromEntries(Object.entries(c.datos).filter(([k]) => k !== 'contrasena')), contrasena_hash: generarHash(c.datos.contrasena) } } : c);
}

test('login conserva claves de prueba y primera apertura independiente; Midi crea flag false y guarda claves', async () => {
  const {rows}=await db.query("select clave_prueba,promociones_abiertas from perfiles where id='A'");
  assert.equal(rows[0].clave_prueba,'Basica2026'); assert.equal(rows[0].promociones_abiertas,false);
  const filas=generarPerfil(()=>0); const cambios=cambiosPerfil(filas);
  cambios.find(c=>c.tabla==='perfiles').datos.clave_prueba='123';
  const datos=await guardar(cambios);
  const creado=datos.perfiles.find(p=>p.id===filas.perfiles[0].id);
  assert.equal(creado.clave_prueba,'123'); assert.equal(creado.promociones_abiertas,false);
  await db.query('update perfiles set promociones_abiertas=true where id=$1',[creado.id]);
  assert.equal((await db.query('select encuesta_completada from preferencias_usuario where usuario_id=$1',[creado.id])).rows[0].encuesta_completada,false);
  const actual=(await leer()).perfiles.find(p=>p.id===creado.id);
  await guardar([{tabla:'perfiles',operacion:'eliminar',clave:{id:actual.id},version:actual._version,dependencias:actual._dependencias}]);
});

test('lectura conjunta devuelve seis tablas, versiones y dependencias sin hashes ni sesiones', async () => {
  const datos = await leer();
  assert.equal(datos.perfiles.length, 6);
  assert.ok(datos.perfiles.every(p => p._version && p._dependencias && !('contrasena_hash' in p)));
  assert.equal(datos.perfiles.find(p => p.id === 'A')._conteos.cuentas, 2);
  assert.ok(!('sesiones_revocadas' in datos));
});

test('guardado conjunto crea perfil, acceso, cuentas y preferencias; devuelve el estado actualizado', async () => {
  const filas = generarPerfil(() => 0.99);
  await db.exec('set role service_role');
  let datos;
  try { datos = await guardar(cambiosPerfil(filas)); } finally { await db.exec('reset role'); }
  const p = datos.perfiles.find(p => p.id === filas.perfiles[0].id);
  assert.ok(p && p.tiene_contrasena);
  assert.equal(datos.cuentas.filter(c => c.perfil_id === p.id).length, 3);
  const { rows } = await db.query('select contrasena_hash from perfiles where id=$1', [p.id]);
  assert.ok(verificarContrasena('123', rows[0].contrasena_hash));
});

test('un registro inválido revierte también los perfiles válidos del mismo lote', async () => {
  const filas = generarPerfil(() => 0);
  const cambios = cambiosPerfil(filas);
  cambios.find(c => c.tabla === 'preferencias_usuario').datos.encuesta_completada = true;
  await assert.rejects(guardar(cambios), e => e.code === '23514');
  assert.equal((await db.query('select id from perfiles where id=$1', [filas.perfiles[0].id])).rows.length, 0);
});

test('versiones viejas y claves incompletas abortan sin sobreescribir datos', async () => {
  const datos = await leer(); const p = datos.perfiles.find(p => p.id === 'A');
  await db.query("update perfiles set nombre='Nombre externo' where id='A'");
  await assert.rejects(guardar([{ tabla: 'perfiles', operacion: 'editar', clave: { id: 'A' }, version: p._version, datos: { id: 'A', nombre: 'Otro' } }]), e => e.code === 'PT409');
  await assert.rejects(guardar([{ tabla: 'perfiles', operacion: 'eliminar', clave: {}, version: '1' }]), e => e.code === '22023');
});

test('eliminar perfil retira dependencias confirmadas, incluyendo guardadas y revocaciones', async () => {
  const filas = generarPerfil(() => 0.99); const id = filas.perfiles[0].id;
  await guardar(cambiosPerfil(filas));
  await db.query("insert into promociones_guardadas values ($1,'cine')", [id]);
  await db.query("insert into sesiones_revocadas values ('00000000-0000-4000-8000-000000000099',$1,now()+interval '1 hour')", [id]);
  const p = (await leer()).perfiles.find(p => p.id === id);
  await db.exec('set role service_role');
  try { await guardar([{ tabla: 'perfiles', operacion: 'eliminar', clave: { id }, version: p._version, dependencias: p._dependencias }]); }
  finally { await db.exec('reset role'); }
  for (const [tabla, campo] of [['perfiles','id'],['cuentas','perfil_id'],['preferencias_usuario','usuario_id'],['promociones_guardadas','usuario_id'],['sesiones_revocadas','usuario_id']]) {
    assert.equal((await db.query(`select count(*)::int as n from ${tabla} where ${campo}=$1`, [id])).rows[0].n, 0);
  }
});

test('dependencias cambiadas impiden un borrado y comercios relacionados no se eliminan', async () => {
  let datos = await leer(); const p = datos.perfiles.find(p => p.id === 'B');
  await db.query("insert into promociones_guardadas values ('B','cine')");
  await assert.rejects(guardar([{ tabla: 'perfiles', operacion: 'eliminar', clave: { id: 'B' }, version: p._version, dependencias: p._dependencias }]), e => e.code === 'PT409');
  const comercio = datos.comercios.find(c => c.id === 'cine');
  await assert.rejects(guardar([{ tabla: 'comercios', operacion: 'eliminar', clave: { id: 'cine' }, version: comercio._version }]), e => e.code === '23503');
});

test('anon y authenticated no pueden leer ni ejecutar las funciones administrativas', async () => {
  for (const rol of ['anon', 'authenticated']) {
    await db.exec(`set role ${rol}`);
    try { await assert.rejects(leer(), e => e.code === '42501'); await assert.rejects(guardar([]), e => e.code === '42501'); }
    finally { await db.exec('reset role'); }
  }
});

test('permite vaciar los datos de prueba en base aislada sin dejar referencias huérfanas', async () => {
  const b = crearBorrador(await leer());
  for (const tabla of ['perfiles','promociones','comercios']) for (const f of [...b.filas[tabla]]) b.eliminar(tabla,f);
  await db.exec('set role service_role');
  let datos;
  try { datos = await guardar(b.cambios()); } finally { await db.exec('reset role'); }
  for (const tabla of ['perfiles','cuentas','preferencias_usuario','comercios','promociones','beneficios_tarjeta']) assert.deepEqual(datos[tabla],[]);
  assert.equal((await db.query('select count(*)::int as n from promociones_guardadas')).rows[0].n,0);
});
