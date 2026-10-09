import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { verificarContrasena } from '../../backend/servicios/contrasenas.js';

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

test('existen las siete tablas persistentes necesarias', async () => {
  const { rows } = await db.query("select tablename from pg_tables where schemaname = 'public' order by tablename");
  assert.deepEqual(rows.map(fila => fila.tablename), [
    'beneficios_tarjeta', 'comercios', 'perfiles', 'preferencias_usuario',
    'promociones', 'promociones_guardadas', 'sucursales'
  ]);
});

test('catálogo original conserva campos y datos para la API existente', async () => {
  const { rows } = await db.query('select id, merchant, category, benefit, description, payment, restrictions from promociones order by orden');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].id, 'restaurante');
  assert.equal(rows[0].benefit, '10 % de descuento');
  assert.ok(rows.every(fila => Object.values(fila).every(valor => typeof valor === 'string')));
});

test('perfiles básica y Black existen y no admiten tarjetas desconocidas', async () => {
  const { rows } = await db.query("select id, tipo_tarjeta from perfiles where id in ('A', 'B') order by id");
  assert.deepEqual(rows, [{ id: 'A', tipo_tarjeta: 'basica' }, { id: 'B', tipo_tarjeta: 'black' }]);
  await assert.rejects(db.query("insert into perfiles (id, nombre, tipo_tarjeta) values ('invalido', 'Prueba', 'otra')"),
    error => error.code === '23514');
});

test('A, B y demo tienen acceso de prueba con hash verificable', async () => {
  const { rows } = await db.query('select id, tipo_tarjeta, usuario_acceso, contrasena_hash from perfiles order by id');
  const perfil = Object.fromEntries(rows.map(fila => [fila.id, fila]));
  assert.equal(perfil.A.usuario_acceso, 'demo.basica');
  assert.equal(verificarContrasena('Basica2026', perfil.A.contrasena_hash), true);
  assert.equal(perfil.B.usuario_acceso, 'demo.black');
  assert.equal(verificarContrasena('Black2026', perfil.B.contrasena_hash), true);
  assert.equal(verificarContrasena('Basica2026', perfil.B.contrasena_hash), false);
  assert.equal(perfil.demo.usuario_acceso, 'demo');
  assert.equal(perfil.demo.tipo_tarjeta, 'basica');
  assert.equal(verificarContrasena('demo123', perfil.demo.contrasena_hash), true);
  for (const contrasena of ['Basica2026', 'Black2026', 'demo123']) {
    assert.ok(rows.every(fila => !fila.contrasena_hash.includes(contrasena)), 'la base no guarda contraseñas en texto');
  }
});

test('usuario de acceso único y siempre acompañado de su hash', async () => {
  await assert.rejects(db.query("update perfiles set usuario_acceso = 'demo.black' where id = 'A'"),
    error => error.code === '23505');
  await assert.rejects(db.query("update perfiles set contrasena_hash = null where id = 'A'"),
    error => error.code === '23514');
  await assert.rejects(db.query("insert into perfiles (id, nombre, usuario_acceso) values ('C', 'Prueba', 'nuevo')"),
    error => error.code === '23514');
});

test('preferencias de A y B quedan separadas; categorías desconocidas se rechazan', async () => {
  await db.query("insert into preferencias_usuario (usuario_id, categorias) values ('A', array['Compras']), ('B', array['Restaurantes'])");
  const { rows } = await db.query('select usuario_id, categorias from preferencias_usuario order by usuario_id');
  assert.deepEqual(rows, [{ usuario_id: 'A', categorias: ['Compras'] }, { usuario_id: 'B', categorias: ['Restaurantes'] }]);
  await assert.rejects(db.query("update preferencias_usuario set categorias = array['Desconocida'] where usuario_id = 'A'"),
    error => error.code === '23514');
});

test('guardadas impiden duplicados y referencias inexistentes', async () => {
  await db.query("insert into promociones_guardadas (usuario_id, promocion_id) values ('A', 'cine')");
  await assert.rejects(db.query("insert into promociones_guardadas values ('A', 'cine')"), error => error.code === '23505');
  await assert.rejects(db.query("insert into promociones_guardadas values ('B', 'no-existe')"), error => error.code === '23503');
  await db.query("insert into promociones_guardadas values ('B', 'cine')");
});

test('beneficios distintos por tarjeta no duplican la promoción', async () => {
  await db.query("insert into beneficios_tarjeta (promocion_id, tipo_tarjeta, beneficio, medio_pago, restricciones) values ('restaurante', 'basica', '10 %', 'Tarjeta básica', 'Prueba'), ('restaurante', 'black', '20 %', 'Tarjeta Black', 'Prueba')");
  const { rows } = await db.query("select count(*)::integer as cantidad from beneficios_tarjeta where promocion_id = 'restaurante'");
  assert.equal(rows[0].cantidad, 2);
  await assert.rejects(db.query("insert into beneficios_tarjeta values ('no-existe', 'black', '20 %', 'Black', 'Prueba')"),
    error => error.code === '23503');
});

test('sucursales necesitan un comercio existente y coordenadas válidas', async () => {
  await assert.rejects(db.query("insert into sucursales (id, comercio_id, nombre, direccion, latitud, longitud) values ('prueba', 'restaurante', 'Prueba', 'Prueba', 91, 0)"),
    error => error.code === '23514');
  await assert.rejects(db.query("insert into sucursales (id, comercio_id, nombre, direccion, latitud, longitud) values ('prueba', 'no-existe', 'Prueba', 'Prueba', 13, -89)"),
    error => error.code === '23503');
});

test('tablas protegidas: RLS activo y sin privilegios directos de navegador', async () => {
  const { rows } = await db.query("select relname, relrowsecurity from pg_class join pg_namespace on pg_namespace.oid = relnamespace where nspname = 'public' and relkind = 'r'");
  assert.equal(rows.length, 7);
  assert.ok(rows.every(fila => fila.relrowsecurity));
  for (const rol of ['anon', 'authenticated']) {
    await db.exec(`set role ${rol}`);
    try {
      for (const tabla of rows.map(fila => fila.relname)) {
        await assert.rejects(db.query(`select * from public.${tabla}`), error => error.code === '42501');
      }
    } finally { await db.exec('reset role'); }
  }
});

test('backend tiene los permisos de escritura necesarios para preferencias y guardadas', async () => {
  for (const tabla of ['preferencias_usuario', 'promociones_guardadas']) {
    for (const permiso of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) {
      const { rows } = await db.query('select has_table_privilege($1, $2, $3) as permitido', ['service_role', tabla, permiso]);
      assert.equal(rows[0].permitido, true, `${tabla}: ${permiso}`);
    }
  }
});
