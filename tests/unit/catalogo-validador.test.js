import test from 'node:test';
import assert from 'node:assert/strict';
import { validarCatalogo } from '../../scripts/catalogo/validar.js';
import { catalogoMinimo, vector } from './catalogo-minimo.js';

const reglas = resultado => resultado.errores.map(error => error.regla);

test('un catálogo coherente no tiene errores ni avisos', () => {
  assert.deepEqual(validarCatalogo(catalogoMinimo()), { errores: [], avisos: [] });
});

test('los errores de forma se informan antes que las reglas del catálogo', () => {
  const catalogo = catalogoMinimo();
  catalogo.promociones[0].canales = ['tienda'];
  assert.deepEqual([...new Set(reglas(validarCatalogo(catalogo)))], ['esquema']);
});

const CASOS = [
  ['identificador repetido', 'id-duplicado', c => { c.promociones[1].id = 'combo'; }],
  ['comercio con categoría inexistente', 'referencia', c => { c.comercios[0].categoria = 'Mascotas'; }],
  ['subcategoría de otra categoría', 'referencia', c => { c.comercios[0].subcategoria = 'farmacias'; }],
  ['subcategoría con categoría inexistente', 'referencia', c => { c.subcategorias[0].categoria = 'Mascotas'; }],
  ['promoción de un comercio inexistente', 'referencia', c => { c.promociones[0].comercio = 'otro'; }],
  ['sucursal en una zona inexistente', 'referencia', c => { c.sucursales[0].zona = 'marte'; }],
  ['cobertura en una zona inexistente', 'referencia', c => { c.cobertura[0].zona = 'marte'; }],
  ['relación con una ocasión inexistente', 'referencia', c => {
    c.relaciones.push({ interesA: 'Restaurantes', interesB: 'Salud', ocasionRequerida: 'mascotas', nota: '' });
  }],
  ['promoción con una sucursal de otro comercio', 'sucursal-ajena', c => { c.promociones[1].sucursales = ['hamburguesas-escalon']; }],
  ['etiqueta de intención fuera del vocabulario', 'etiqueta', c => { c.promociones[0].etiquetasIntencion = ['antojo']; }],
  ['beneficio repetido para la misma tarjeta', 'beneficio-duplicado', c => {
    c.promociones[0].beneficios.push({ ...c.promociones[0].beneficios[0] });
  }],
  ['comercio sensible con ocasiones', 'sensible', c => { c.comercios[1].ocasiones = vector({ bienestar: 1 }); }],
  ['comercio no sensible sin las 11 ocasiones', 'ocasiones-incompletas', c => { delete c.comercios[0].ocasiones.viajes; }],
  ['promoción que sobrescribe solo parte de las ocasiones', 'ocasiones-incompletas', c => { c.promociones[0].ocasiones = { salir: 1 }; }],
  ['promoción presencial sin sucursales', 'presencial-sin-sucursales', c => { c.sucursales = c.sucursales.filter(s => s.comercio !== 'hamburguesas'); }],
  ['promoción presencial con lista de sucursales vacía', 'presencial-sin-sucursales', c => { c.promociones[1].sucursales = []; }],
  ['promoción de delivery sin cobertura del comercio', 'delivery-sin-cobertura', c => { c.cobertura = []; }],
  ['sucursal fuera de El Salvador', 'coordenadas', c => { c.sucursales[0].coordenadas = { latitud: 14.6349, longitud: -90.5069 }; }],
  ['centro de zona fuera de El Salvador', 'coordenadas', c => { c.zonas[0].centro = { latitud: 9.9281, longitud: -84.0907 }; }],
  ['descripción repetida', 'descripcion-duplicada', c => { c.promociones[1].descripcion = c.promociones[0].descripcion; }],
  ['descripción de detalle repetida', 'descripcion-duplicada', c => {
    c.promociones[1].descripcionDetalle = c.promociones[0].descripcionDetalle;
  }],
  ['vigencia que termina antes de empezar', 'vigencia', c => { c.promociones[0].vigencia = { desde: '2026-12-31', hasta: '2026-10-01' }; }],
  ['fecha inexistente', 'vigencia', c => { c.promociones[0].vigencia.hasta = '2026-02-30'; }]
];

for (const [caso, regla, alterar] of CASOS) {
  test(`el validador rechaza: ${caso}`, () => {
    const catalogo = catalogoMinimo();
    alterar(catalogo);
    assert.ok(reglas(validarCatalogo(catalogo)).includes(regla), JSON.stringify(validarCatalogo(catalogo)));
  });
}

test('cada error identifica la entidad afectada y explica el motivo', () => {
  const catalogo = catalogoMinimo();
  catalogo.promociones[0].comercio = 'otro';
  const [error] = validarCatalogo(catalogo).errores;
  assert.equal(error.entidad, 'promociones');
  assert.equal(error.id, 'combo');
  assert.match(error.mensaje, /otro/);
});

test('un vector de ocasiones en cero solo genera un aviso', () => {
  const catalogo = catalogoMinimo();
  catalogo.comercios[0].ocasiones = vector();
  const resultado = validarCatalogo(catalogo);
  assert.deepEqual(resultado.errores, []);
  assert.deepEqual(resultado.avisos.map(aviso => [aviso.regla, aviso.id]), [['vector-vacio', 'hamburguesas']]);
});

test('una promoción solo en línea no necesita sucursales ni cobertura', () => {
  const catalogo = catalogoMinimo();
  catalogo.promociones[0].canales = ['en-linea'];
  catalogo.cobertura = [];
  assert.deepEqual(validarCatalogo(catalogo).errores, []);
});

test('las imágenes de la fuente deben existir dentro de public', () => {
  const pedidas = [];
  const existeArchivo = ruta => { pedidas.push(ruta); return ruta !== '/recursos/promociones/vitaminas.webp'; };
  const resultado = validarCatalogo(catalogoMinimo(), { existeArchivo });
  assert.deepEqual(resultado.errores.map(error => [error.regla, error.id]), [['imagen-inexistente', 'vitaminas']]);
  for (const ruta of ['/recursos/categorias/restaurantes.svg', '/recursos/categorias/salud.webp', '/recursos/comercios/hamburguesas.png',
    '/recursos/promociones/combo.webp']) assert.ok(pedidas.includes(ruta), ruta);
});
