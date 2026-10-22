import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };
import { generarSqlCatalogo } from '../../scripts/catalogo/sql.js';
import { sucursalesParticipantes, beneficioPrincipal } from '../../backend/catalogo.js';

const carpeta = new URL('../../supabase/migrations/', import.meta.url);
const TABLAS_NUEVAS = ['ocasiones', 'zonas', 'subcategorias', 'promocion_sucursales', 'cobertura', 'relaciones_intereses'];
let migraciones;
let db;

async function baseConMigraciones() {
  const base = new PGlite();
  await base.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  for (const archivo of migraciones) await base.exec(await readFile(new URL(archivo, carpeta), 'utf8'));
  return base;
}
before(async () => {
  migraciones = (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort();
  db = await baseConMigraciones();
});
after(async () => { await db?.close(); });

const filas = async (sql, parametros, base = db) => (await base.query(sql, parametros)).rows;
const fecha = valor => valor instanceof Date ? valor.toISOString().slice(0, 10) : valor;
const numero = valor => valor === null ? null : Number(valor);
const ids = entidad => fuente[entidad].map(item => item.id);

test('H24 crea las tablas del contrato con RLS y lectura solo para el backend', async () => {
  const tablas = await filas(`select relname, relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where nspname = 'public' and relkind = 'r' and relname = any($1) order by relname`, [TABLAS_NUEVAS]);
  assert.deepEqual(tablas.map(fila => fila.relname), [...TABLAS_NUEVAS].sort());
  assert.ok(tablas.every(fila => fila.relrowsecurity));
  for (const tabla of TABLAS_NUEVAS) {
    const [permisos] = await filas(`select has_table_privilege('service_role', $1, 'select') as backend,
      has_table_privilege('anon', $1, 'select') as anon, has_table_privilege('authenticated', $1, 'select') as autenticado`, ['public.' + tabla]);
    assert.deepEqual(permisos, { backend: true, anon: false, autenticado: false }, tabla);
  }
});

test('H24 agrega las columnas del contrato como opcionales para no romper a Midi', async () => {
  const columnas = {
    categorias: ['icono_url'],
    comercios: ['categoria_id', 'subcategoria_id', 'ocasiones', 'nivel_precio', 'reconocible', 'sensible', 'afinar_por'],
    promociones: ['titulo', 'condiciones', 'canales', 'tipo_beneficio', 'condicion_decisiva', 'etiquetas_intencion', 'fecha_alta',
      'ocasiones', 'nivel_precio'],
    sucursales: ['zona_id']
  };
  for (const [tabla, esperadas] of Object.entries(columnas)) {
    const existentes = await filas(`select column_name, is_nullable from information_schema.columns
      where table_schema = 'public' and table_name = $1 and column_name = any($2) order by column_name`, [tabla, esperadas]);
    assert.deepEqual(existentes, [...esperadas].sort().map(column_name => ({ column_name, is_nullable: 'YES' })), tabla);
  }
});

test('H24 la base contiene el catálogo de la fuente única', async () => {
  assert.deepEqual(await filas('select id, nombre, ejemplos, orden from ocasiones order by orden'),
    fuente.ocasiones.map(({ id, nombre, ejemplos, orden }) => ({ id, nombre, ejemplos, orden })));
  assert.deepEqual(await filas('select id, nombre, latitud, longitud from zonas order by orden'),
    fuente.zonas.map(zona => ({ id: zona.id, nombre: zona.nombre, latitud: zona.centro.latitud, longitud: zona.centro.longitud })));
  assert.deepEqual(await filas('select id, nombre, icono_url, imagen_url, orden from categorias where id = any($1) order by orden', [ids('categorias')]),
    fuente.categorias.map(c => ({ id: c.id, nombre: c.nombre, icono_url: c.icono, imagen_url: c.imagen, orden: c.orden })));
  assert.deepEqual(await filas('select id, nombre, categoria_id from subcategorias order by id'),
    fuente.subcategorias.map(s => ({ id: s.id, nombre: s.nombre, categoria_id: s.categoria })).sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(await filas(`select id, nombre, logo_url, categoria_id, subcategoria_id, ocasiones, nivel_precio, reconocible, sensible, afinar_por
    from comercios where id = any($1) order by id`, [ids('comercios')]),
  fuente.comercios.map(c => ({ id: c.id, nombre: c.nombre, logo_url: c.logo, categoria_id: c.categoria, subcategoria_id: c.subcategoria,
    ocasiones: c.ocasiones, nivel_precio: c.nivelPrecio, reconocible: c.reconocible, sensible: c.sensible, afinar_por: c.afinarPor }))
    .sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(await filas('select id, comercio_id, nombre, direccion, latitud, longitud, zona_id from sucursales order by id'),
    fuente.sucursales.map(s => ({ id: s.id, comercio_id: s.comercio, nombre: s.nombre, direccion: s.direccion,
      latitud: s.coordenadas.latitud, longitud: s.coordenadas.longitud, zona_id: s.zona })).sort((a, b) => a.id.localeCompare(b.id)));
  assert.deepEqual(await filas('select comercio_id, zona_id, estado from cobertura order by comercio_id, zona_id'),
    fuente.cobertura.map(c => ({ comercio_id: c.comercio, zona_id: c.zona, estado: c.estado }))
      .sort((a, b) => a.comercio_id.localeCompare(b.comercio_id) || a.zona_id.localeCompare(b.zona_id)));
  assert.deepEqual(await filas('select * from relaciones_intereses'), []);
});

test('H24 cada promoción de la fuente queda con sus campos nuevos, los anteriores, beneficios y sucursales participantes', async () => {
  const comercios = new Map(fuente.comercios.map(c => [c.id, c]));
  const promociones = await filas(`select id, merchant, category, benefit, description, payment, restrictions, comercio_id, titulo,
    descripcion_detalle, condiciones, instrucciones, imagen_url, imagen_alt, vigencia_desde, vigencia_hasta, dias_uso, canales, tipo_beneficio,
    condicion_decisiva, etiquetas_intencion, fecha_alta, ocasiones, nivel_precio from promociones where id = any($1) order by orden`, [ids('promociones')]);
  assert.deepEqual(promociones.map(p => ({ ...p, vigencia_desde: fecha(p.vigencia_desde), vigencia_hasta: fecha(p.vigencia_hasta), fecha_alta: fecha(p.fecha_alta) })),
    fuente.promociones.map(p => {
      const principal = beneficioPrincipal(p.beneficios);
      return { id: p.id, merchant: comercios.get(p.comercio).nombre, category: comercios.get(p.comercio).categoria, benefit: principal.beneficio,
        description: p.descripcion, payment: principal.medioPago, restrictions: p.restricciones, comercio_id: p.comercio, titulo: p.titulo,
        descripcion_detalle: p.descripcionDetalle, condiciones: p.condiciones, instrucciones: p.instrucciones, imagen_url: p.imagen,
        imagen_alt: p.textoAlternativo, vigencia_desde: p.vigencia.desde, vigencia_hasta: p.vigencia.hasta, dias_uso: p.dias, canales: p.canales,
        tipo_beneficio: p.tipoBeneficio, condicion_decisiva: p.condicionDecisiva, etiquetas_intencion: p.etiquetasIntencion, fecha_alta: p.alta,
        ocasiones: p.ocasiones ?? null, nivel_precio: p.nivelPrecio ?? null };
    }));
  const beneficios = await filas(`select promocion_id, tipo_tarjeta, beneficio, medio_pago, restricciones, compra_minima, tope_descuento
    from beneficios_tarjeta where promocion_id = any($1) order by promocion_id, tipo_tarjeta`, [ids('promociones')]);
  assert.deepEqual(beneficios.map(b => ({ ...b, compra_minima: numero(b.compra_minima), tope_descuento: numero(b.tope_descuento) })),
    fuente.promociones.flatMap(p => p.beneficios.map(b => ({ promocion_id: p.id, tipo_tarjeta: b.tarjeta, beneficio: b.beneficio,
      medio_pago: b.medioPago, restricciones: b.restricciones, compra_minima: b.compraMinima, tope_descuento: b.tope })))
      .sort((a, b) => a.promocion_id.localeCompare(b.promocion_id) || a.tipo_tarjeta.localeCompare(b.tipo_tarjeta)));
  assert.deepEqual(await filas('select promocion_id, sucursal_id from promocion_sucursales order by promocion_id, sucursal_id'),
    fuente.promociones.flatMap(p => sucursalesParticipantes(p, fuente.sucursales).map(s => ({ promocion_id: p.id, sucursal_id: s.id })))
      .sort((a, b) => a.promocion_id.localeCompare(b.promocion_id) || a.sucursal_id.localeCompare(b.sucursal_id)));
});

test('H24 la base rechaza valores fuera del contrato', async () => {
  const [presencial] = fuente.sucursales;
  const sinCobertura = fuente.comercios.find(c => !fuente.cobertura.some(cobertura => cobertura.comercio === c.id));
  const otraCategoria = fuente.subcategorias.find(s => s.categoria !== fuente.comercios[0].categoria);
  const casos = [
    ["update promociones set canales = array['tienda'] where id = 'restaurante'", '23514'],
    ["update promociones set canales = '{}' where id = 'restaurante'", '23514'],
    ["update promociones set tipo_beneficio = 'regalo' where id = 'restaurante'", '23514'],
    ["update promociones set etiquetas_intencion = array['antojo'] where id = 'restaurante'", '23514'],
    ["update promociones set nivel_precio = 4 where id = 'restaurante'", '23514'],
    ["update comercios set afinar_por = 'marca' where id = 'restaurante'", '23514'],
    [`update comercios set ocasiones = '{"salir": 0.3}' where id = 'restaurante'`, '23514'],
    [`update comercios set ocasiones = '{"mascotas": 1}' where id = 'restaurante'`, '23514'],
    [`update promociones set ocasiones = '["salir"]' where id = 'restaurante'`, '23514'],
    [`insert into cobertura values ('${sinCobertura.id}', 'escalon', 'quizas')`, '23514'],
    [`update comercios set subcategoria_id = '${otraCategoria.id}' where id = '${fuente.comercios[0].id}'`, '23503'],
    [`update sucursales set zona_id = 'marte' where id = '${presencial.id}'`, '23503']
  ];
  for (const [sql, codigo] of casos) await assert.rejects(db.query(sql), error => error.code === codigo, sql);
});

test('H24 la carga es idempotente y sincroniza lo que define la fuente sin borrar lo creado fuera de ella', async () => {
  const otra = await baseConMigraciones();
  try {
    const tablas = ['ocasiones', 'zonas', 'categorias', 'subcategorias', 'comercios', 'categoria_comercios', 'sucursales', 'cobertura',
      'promociones', 'beneficios_tarjeta', 'promocion_sucursales'];
    const contar = async () => Object.fromEntries(await Promise.all(tablas.map(async tabla =>
      [tabla, (await otra.query(`select count(*)::int as total from public.${tabla}`)).rows[0].total])));
    const antes = await contar();
    await otra.exec(generarSqlCatalogo(fuente));
    assert.deepEqual(await contar(), antes);

    await otra.exec(`insert into promociones (id, merchant, category, benefit, description, payment, restrictions, comercio_id)
      values ('externa', 'Externa', 'Compras', '5 %', 'Oferta creada fuera de la fuente', 'Tarjeta Básica', '', 'tienda')`);
    const modificada = structuredClone(fuente);
    const promocion = modificada.promociones.find(p => p.beneficios.length === 2);
    promocion.beneficios = promocion.beneficios.filter(b => b.tarjeta === 'basica');
    const [retirada] = modificada.cobertura.splice(0, 1);
    await otra.exec(generarSqlCatalogo(modificada));
    assert.deepEqual((await filas('select tipo_tarjeta from beneficios_tarjeta where promocion_id = $1', [promocion.id], otra)).map(b => b.tipo_tarjeta), ['basica']);
    assert.deepEqual(await filas('select * from cobertura where comercio_id = $1 and zona_id = $2', [retirada.comercio, retirada.zona], otra), []);
    assert.equal((await filas("select count(*)::int as total from promociones where id = 'externa'", [], otra))[0].total, 1);
  } finally { await otra.close(); }
});

test('H24 la última carga generada coincide con la fuente actual', async () => {
  const generadas = [];
  for (const archivo of migraciones) {
    // Git en Windows (core.autocrlf) entrega los .sql con CRLF; el generador escribe LF.
    const sql = (await readFile(new URL(archivo, carpeta), 'utf8')).replaceAll('\r\n', '\n');
    if (sql.startsWith('-- Generado desde catalogo/catalogo.json')) generadas.push(sql);
  }
  assert.ok(generadas.length > 0, 'Falta la migración generada con npm run catalogo:generar.');
  assert.equal(generadas.at(-1), generarSqlCatalogo(fuente), 'La fuente cambió: genera una migración nueva con npm run catalogo:generar -- <nombre>.');
});

test('H24 Midi sigue creando y eliminando comercios y promociones sin conocer las columnas nuevas', async () => {
  const otra = await baseConMigraciones();
  const guardar = async cambios => (await otra.query('select public.midi_guardar_cambios($1::jsonb) as datos', [JSON.stringify(cambios)])).rows[0].datos;
  try {
    await guardar([
      { tabla: 'comercios', operacion: 'crear', clave: { id: 'midi-h24' }, datos: { id: 'midi-h24', nombre: 'Comercio de Midi', logo_url: null } },
      { tabla: 'categoria_comercios', operacion: 'crear', clave: { categoria_id: 'Compras', comercio_id: 'midi-h24' },
        datos: { categoria_id: 'Compras', comercio_id: 'midi-h24' } },
      { tabla: 'promociones', operacion: 'crear', clave: { id: 'midi-h24' }, datos: { id: 'midi-h24', merchant: 'Comercio de Midi',
        category: 'Compras', benefit: '5 %', description: 'Oferta creada en Midi', payment: 'Tarjeta Básica', restrictions: '', orden: 99,
        comercio_id: 'midi-h24', instrucciones: '', descripcion_detalle: '' } }
    ]);
    const [creada] = await filas("select canales, tipo_beneficio, fecha_alta from promociones where id = 'midi-h24'", [], otra);
    assert.deepEqual(creada, { canales: null, tipo_beneficio: null, fecha_alta: null });

    const conSucursales = fuente.promociones.find(p => sucursalesParticipantes(p, fuente.sucursales).length);
    const leida = (await otra.query('select public.midi_leer_datos() as datos')).rows[0].datos.promociones.find(p => p.id === conSucursales.id);
    await guardar([{ tabla: 'promociones', operacion: 'eliminar', clave: { id: leida.id }, version: leida._version, dependencias: leida._dependencias }]);
    assert.deepEqual(await filas('select * from promocion_sucursales where promocion_id = $1', [leida.id], otra), []);
  } finally { await otra.close(); }
});
