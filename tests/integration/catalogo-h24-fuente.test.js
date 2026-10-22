import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };
import manifiesto from '../../catalogo/imagenes.json' with { type: 'json' };
import { validarCatalogo } from '../../scripts/catalogo/validar.js';

const enPublic = ruta => existsSync(fileURLToPath(new URL('../../public' + ruta, import.meta.url)));
const conjunto = valores => [...new Set(valores)].sort();

test('H24 la fuente única cumple el contrato, sus reglas y tiene todas sus imágenes en public', () => {
  assert.deepEqual(validarCatalogo(fuente, { existeArchivo: enPublic }), { errores: [], avisos: [] });
});

test('H24 el esqueleto tiene unas 20 promociones en unas 6 categorías y 12 comercios', () => {
  assert.ok(fuente.promociones.length >= 18 && fuente.promociones.length <= 25, `${fuente.promociones.length} promociones`);
  assert.ok(fuente.categorias.length >= 6, `${fuente.categorias.length} categorías`);
  assert.ok(fuente.comercios.length >= 12, `${fuente.comercios.length} comercios`);
});

test('H24 el esqueleto cubre todas las variantes del contrato', () => {
  const { promociones, comercios } = fuente;
  assert.deepEqual(conjunto(promociones.flatMap(p => p.canales)), ['delivery', 'en-linea', 'presencial']);
  assert.deepEqual(conjunto(promociones.map(p => p.tipoBeneficio)), ['2x1-combo', 'cashback-puntos', 'cuotas-sin-intereses', 'descuento']);
  assert.deepEqual(conjunto(comercios.map(c => c.nivelPrecio)), [1, 2, 3]);
  assert.ok(promociones.some(p => p.beneficios.length === 1 && p.beneficios[0].tarjeta === 'black'), 'exclusiva Black');
  assert.ok(promociones.some(p => p.beneficios.length === 2), 'beneficio para ambas tarjetas');
  assert.ok(promociones.some(p => p.dias !== null), 'días limitados');
  assert.ok(promociones.some(p => p.etiquetasIntencion.includes('regalo')), 'etiqueta Regalo');
  assert.deepEqual(conjunto(comercios.map(c => c.afinarPor)), ['comercio', 'no', 'subcategoria']);
  assert.deepEqual(conjunto(fuente.cobertura.map(c => c.estado)), ['desconocida', 'no', 'si']);

  const sensible = fuente.categorias.find(categoria => {
    const propios = comercios.filter(c => c.categoria === categoria.id);
    return propios.length && propios.every(c => c.sensible);
  });
  assert.ok(sensible, 'una categoría sensible');
  assert.ok(fuente.subcategorias.filter(s => s.categoria === sensible.id).length >= 2, 'la categoría sensible tiene subcategorías');
  assert.ok(comercios.filter(c => c.sensible).every(c => Object.keys(c.ocasiones).length === 0), 'sensibles con ocasiones vacías');
});

test('H24 la lista fija de zonas acordada tiene su centro y cada sucursal pertenece a una', () => {
  assert.deepEqual(fuente.zonas.map(zona => zona.nombre),
    ['San Salvador Centro', 'Escalón', 'Antiguo Cuscatlán', 'Santa Tecla', 'Soyapango', 'Santa Ana', 'San Miguel']);
  const zonas = new Set(fuente.zonas.map(zona => zona.id));
  assert.ok(fuente.sucursales.every(sucursal => zonas.has(sucursal.zona)));
  for (const comercio of fuente.comercios.filter(c => fuente.promociones.some(p => p.comercio === c.id && p.canales.includes('presencial')))) {
    assert.ok(fuente.sucursales.some(sucursal => sucursal.comercio === comercio.id), `${comercio.id} sin sucursal`);
  }
});

test('H24 conserva las cinco promociones actuales y sus beneficios, y todo el catálogo está vigente hasta fin de año', () => {
  const actuales = { restaurante: 'restaurante', tienda: 'tienda', cine: 'cine', starbucks: 'starbucks', 'siman-black': 'tienda' };
  for (const [id, comercio] of Object.entries(actuales)) assert.equal(fuente.promociones.find(p => p.id === id)?.comercio, comercio, id);
  const beneficios = fuente.promociones.filter(p => p.id in actuales)
    .flatMap(p => p.beneficios.map(b => [p.id, b.tarjeta, b.beneficio, b.compraMinima, b.tope]));
  assert.deepEqual(beneficios.sort(), [
    ['cine', 'basica', '2×1 en entradas', null, null], ['cine', 'black', '2×1 en entradas y 20 % en combo', null, null],
    ['restaurante', 'basica', '10 % de descuento', null, null], ['restaurante', 'black', '20 % de descuento', null, null],
    ['siman-black', 'black', '30 % de descuento', 50, 30],
    ['starbucks', 'basica', '10 % de descuento', null, null], ['starbucks', 'black', '20 % de descuento', null, null],
    ['tienda', 'basica', '15 % de descuento', 30, 15], ['tienda', 'black', '25 % de descuento', 30, 25]
  ].sort());
  for (const { id, vigencia } of fuente.promociones) {
    assert.ok(vigencia.desde <= '2026-10-20', `${id} todavía no está vigente`);
    assert.ok(vigencia.hasta >= '2026-12-31', `${id} termina antes del 31 de diciembre`);
  }
});

test('H24 cada imagen del catálogo registra su origen en el manifiesto', () => {
  const rutas = new Set([
    ...fuente.categorias.flatMap(c => [c.icono, c.imagen]).filter(Boolean),
    ...fuente.comercios.map(c => c.logo),
    ...fuente.promociones.map(p => p.imagen)
  ]);
  const porRuta = new Map(manifiesto.imagenes.map(imagen => [imagen.ruta, imagen]));
  for (const ruta of rutas) {
    const imagen = porRuta.get(ruta);
    assert.ok(imagen, `${ruta} no está en catalogo/imagenes.json`);
    assert.match(imagen.origen, /^https:\/\//, ruta);
    for (const campo of ['autor', 'licencia', 'descripcion']) assert.ok(imagen[campo]?.trim(), `${ruta}: falta ${campo}`);
  }
});
