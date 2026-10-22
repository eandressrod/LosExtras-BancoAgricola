import test from 'node:test';
import assert from 'node:assert/strict';
import { generarSqlCatalogo, literalSql } from '../../scripts/catalogo/sql.js';
import { catalogoMinimo } from './catalogo-minimo.js';

test('los literales SQL escapan comillas y representan nulos, números, booleanos, listas y JSON', () => {
  assert.equal(literalSql("D'Juan"), "'D''Juan'");
  assert.equal(literalSql(null), 'null');
  assert.equal(literalSql(undefined), 'null');
  assert.equal(literalSql(0.5), '0.5');
  assert.equal(literalSql(false), 'false');
  assert.equal(literalSql([1, 2], 'smallint'), 'array[1,2]::smallint[]');
  assert.equal(literalSql([], 'text'), "'{}'::text[]");
  assert.equal(literalSql({ salir: 0.5 }, 'jsonb'), `'{"salir":0.5}'::jsonb`);
});

test('la carga recorre las tablas en orden de dependencias y cada inserción es un upsert', () => {
  const sql = generarSqlCatalogo(catalogoMinimo());
  const tablas = ['ocasiones', 'zonas', 'categorias', 'subcategorias', 'comercios', 'categoria_comercios', 'sucursales',
    'cobertura', 'promociones', 'beneficios_tarjeta', 'promocion_sucursales'];
  const posiciones = tablas.map(tabla => sql.indexOf(`insert into public.${tabla} (`));
  assert.ok(posiciones.every(posicion => posicion >= 0), JSON.stringify(Object.fromEntries(tablas.map((t, i) => [t, posiciones[i]]))));
  assert.deepEqual([...posiciones].sort((a, b) => a - b), posiciones);
  assert.equal(sql.match(/insert into /g).length, sql.match(/on conflict /g).length);
  assert.ok(!sql.includes('insert into public.relaciones_intereses'), 'una tabla vacía no genera inserción');
});

test('la carga identifica su origen y es estable para la misma fuente', () => {
  const sql = generarSqlCatalogo(catalogoMinimo());
  assert.match(sql.split('\n')[0], /^-- Generado desde catalogo\/catalogo\.json/);
  assert.equal(generarSqlCatalogo(catalogoMinimo()), sql);
  assert.ok(sql.includes("'Hamburguesas D''Juan'"));
});

test('la carga mantiene llenas las columnas anteriores de promociones para la API existente', () => {
  const sql = generarSqlCatalogo(catalogoMinimo());
  const fila = sql.slice(sql.indexOf('insert into public.promociones ('));
  assert.match(fila, /\('combo', 'Hamburguesas D''Juan', 'Restaurantes', '10 % de descuento', 'Tu combo favorito con descuento\.', 'Tarjeta Básica', 'No acumulable con otras ofertas\.', 1,/);
});

test('la carga sincroniza beneficios, sucursales participantes y cobertura sin borrar promociones ajenas a la fuente', () => {
  const sql = generarSqlCatalogo(catalogoMinimo());
  assert.match(sql, /delete from public\.beneficios_tarjeta where promocion_id in \('combo', 'vitaminas'\) and \(promocion_id, tipo_tarjeta\) not in \(/);
  assert.match(sql, /delete from public\.promocion_sucursales where promocion_id in \('combo', 'vitaminas'\);/);
  assert.match(sql, /delete from public\.cobertura where comercio_id in \('hamburguesas', 'farmacia'\) and \(comercio_id, zona_id\) not in \(/);
  assert.ok(!/delete from public\.promociones\b/.test(sql));
  assert.ok(!/delete from public\.comercios\b/.test(sql));
});

test('sin lista de sucursales la promoción presencial participa en todas las del comercio', () => {
  const sql = generarSqlCatalogo(catalogoMinimo());
  const relacion = sql.slice(sql.indexOf('insert into public.promocion_sucursales ('));
  for (const par of ["('combo', 'hamburguesas-escalon')", "('combo', 'hamburguesas-santa-tecla')", "('vitaminas', 'farmacia-escalon')"]) {
    assert.ok(relacion.includes(par), par);
  }
});
