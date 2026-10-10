import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { crearToken } from '../../backend/servicios/sesion.js';
import * as autenticacion from '../../backend/servicios/autenticacion.js';
import { crearRepositorioAccesosSupabase } from '../../backend/repositorios/accesos.supabase.js';
import { crearRepositorioEstadoEncuestaSupabase } from '../../backend/repositorios/estado-encuesta.supabase.js';
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

test('existen las tablas persistentes de catálogo y revocación de sesiones', async () => {
  const { rows } = await db.query("select tablename from pg_tables where schemaname = 'public' order by tablename");
  assert.deepEqual(rows.map(fila => fila.tablename), [
    'beneficios_tarjeta', 'comercios', 'cuentas', 'perfiles', 'preferencias_usuario',
    'promociones', 'promociones_guardadas', 'sesiones_revocadas', 'sucursales'
  ]);
});

test('catálogo ampliado conserva identificadores y campos para la API existente', async () => {
  const { rows } = await db.query('select id, merchant, category, benefit, description, payment, restrictions from promociones order by orden');
  assert.equal(rows.length, 5);
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
  await db.query("insert into beneficios_tarjeta (promocion_id, tipo_tarjeta, beneficio, medio_pago, restricciones) values ('restaurante', 'basica', '10 %', 'Tarjeta básica', 'Prueba'), ('restaurante', 'black', '20 %', 'Tarjeta Black', 'Prueba') on conflict (promocion_id, tipo_tarjeta) do update set beneficio = excluded.beneficio");
  const { rows } = await db.query("select count(*)::integer as cantidad from beneficios_tarjeta where promocion_id = 'restaurante'");
  assert.equal(rows[0].cantidad, 2);
  const beneficios = await db.query("select beneficio from beneficios_tarjeta where promocion_id = 'restaurante' order by tipo_tarjeta");
  assert.deepEqual(beneficios.rows.map(item => item.beneficio), ['10 %', '20 %']);
  await assert.rejects(db.query("insert into beneficios_tarjeta (promocion_id, tipo_tarjeta, beneficio, medio_pago, restricciones) values ('no-existe', 'black', '20 %', 'Black', 'Prueba')"),
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
  assert.equal(rows.length, 9);
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

test('revocación persistida en PostgreSQL se respeta desde otra instancia del repositorio', async () => {
  process.env.SESSION_SECRET = 'p'.repeat(40);
  // Adaptador del transporte para probar servicio → repositorio → PostgreSQL real en memoria.
  const client = { from(tabla) {
    assert.ok(['perfiles', 'sesiones_revocadas'].includes(tabla));
    let campos;
    let filtro;
    return {
      select(valor) { campos = valor; return this; },
      eq(campo, valor) { assert.equal(campo, 'id'); filtro = valor; return this; },
      async maybeSingle() {
        const { rows } = await db.query(`select ${campos} from public.${tabla} where id = $1`, [filtro]);
        return { data: rows[0] ?? null, error: null };
      },
      async upsert(fila, opciones) {
        assert.equal(tabla, 'sesiones_revocadas');
        assert.equal(opciones.ignoreDuplicates, true);
        await db.query('insert into public.sesiones_revocadas (id, usuario_id, expira_en) values ($1, $2, $3) on conflict (id) do nothing', [fila.id, fila.usuario_id, fila.expira_en]);
        return { error: null };
      }
    };
  } };
  const repoA = crearRepositorioAccesosSupabase(client);
  const repoB = crearRepositorioAccesosSupabase(client);
  const token = crearToken('A');
  const otro = crearToken('A');
  assert.equal((await autenticacion.perfilDeSesion(token, repoA)).id, 'A');
  await autenticacion.cerrarSesion(token, repoA);
  await autenticacion.cerrarSesion(token, repoB);
  assert.equal(await autenticacion.perfilDeSesion(token, repoB), null);
  assert.equal((await autenticacion.perfilDeSesion(otro, repoB)).id, 'A');
  const { rows } = await db.query('select count(*)::integer as cantidad from public.sesiones_revocadas');
  assert.equal(rows[0].cantidad, 1);
  for (const permiso of ['SELECT', 'INSERT']) {
    const { rows } = await db.query('select has_table_privilege($1, $2, $3) as permitido', ['service_role', 'sesiones_revocadas', permiso]);
    assert.equal(rows[0].permitido, true);
  }
});

test('cuentas tienen propietario, números enmascarados y permiten añadir filas sin cambiar el menú', async () => {
  const { rows } = await db.query('select perfil_id, count(*)::integer as total from public.cuentas group by perfil_id order by perfil_id');
  assert.deepEqual(rows, [{ perfil_id: 'A', total: 2 }, { perfil_id: 'B', total: 2 }, { perfil_id: 'demo', total: 2 }]);
  await db.query("insert into public.cuentas (id, perfil_id, nombre, tipo, numero_enmascarado) values ('extra-a', 'A', 'Cuenta adicional', 'Ahorro', '•••• 4567')");
  const extra = await db.query("select count(*)::integer as total from public.cuentas where perfil_id='A'");
  assert.equal(extra.rows[0].total, 3);
  await assert.rejects(db.query("insert into public.cuentas (id, perfil_id, nombre, tipo, numero_enmascarado) values ('sin-dueno', 'inexistente', 'Prueba', 'Ahorro', '•••• 4567')"), error => error.code === '23503');
  for (const rol of ['anon', 'authenticated']) {
    await db.exec(`set role ${rol}`);
    try {
      await assert.rejects(db.query('select * from public.cuentas'), error => error.code === '42501');
    } finally { await db.exec('reset role'); }
  }
});

test('la migración de cuentas es aditiva y no sobrescribe datos existentes al registrar la base', async () => {
  const carpeta = new URL('../../supabase/migrations/', import.meta.url);
  const archivo = (await readdir(carpeta)).find(nombre => nombre.endsWith('_cuentas_menu.sql'));
  assert.ok(archivo, 'falta migración reproducible de cuentas');
  await db.query("update public.cuentas set saldo=99 where id='cta-a-1'");
  await db.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
  const actual = await db.query("select saldo from public.cuentas where id='cta-a-1'");
  assert.equal(Number(actual.rows[0].saldo), 99);
});

test('estado de encuesta usa el booleano real de PostgreSQL y mantiene aislamiento por usuario', async () => {
  const client = { from(tabla) {
    assert.equal(tabla, 'preferencias_usuario');
    let usuario;
    return {
      select(campos) { assert.equal(campos, 'encuesta_completada'); return this; },
      eq(campo, valor) { assert.equal(campo, 'usuario_id'); usuario = valor; return this; },
      async maybeSingle() {
        const { rows } = await db.query('select encuesta_completada from public.preferencias_usuario where usuario_id=$1', [usuario]);
        return { data: rows[0] ?? null, error: null };
      }
    };
  } };
  const repo = crearRepositorioEstadoEncuestaSupabase(client);
  assert.equal(await repo.estaCompletada('A'), false);
  assert.equal(await repo.estaCompletada('demo'), false);
  await db.query("update public.preferencias_usuario set encuesta_completada=true where usuario_id='B'");
  assert.equal(await repo.estaCompletada('B'), true);
  assert.equal(await repo.estaCompletada('A'), false);
});
