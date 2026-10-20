import test from 'node:test';
import assert from 'node:assert/strict';
import { esquemaCatalogo, validarEsquema } from '../../scripts/catalogo/validar.js';
import { catalogoMinimo } from './catalogo-minimo.js';

// Entidades y campos del contrato de H24 (SCRUM-115); el esquema es su forma versionada.
const CONTRATO = {
  Categoria: ['id', 'nombre', 'icono', 'imagen', 'orden'],
  Subcategoria: ['id', 'nombre', 'categoria'],
  Comercio: ['id', 'nombre', 'logo', 'categoria', 'subcategoria', 'ocasiones', 'nivelPrecio', 'reconocible', 'sensible', 'afinarPor'],
  Promocion: ['id', 'comercio', 'titulo', 'descripcion', 'descripcionDetalle', 'condiciones', 'restricciones', 'instrucciones',
    'imagen', 'textoAlternativo', 'beneficios', 'vigencia', 'dias', 'canales', 'condicionDecisiva', 'tipoBeneficio',
    'etiquetasIntencion', 'alta'],
  Beneficio: ['tarjeta', 'beneficio', 'medioPago', 'restricciones', 'compraMinima', 'tope'],
  Sucursal: ['id', 'comercio', 'nombre', 'direccion', 'coordenadas', 'zona'],
  Zona: ['id', 'nombre', 'centro'],
  Cobertura: ['comercio', 'zona', 'estado'],
  Relacion: ['interesA', 'interesB', 'ocasionRequerida', 'nota']
};

test('el esquema declara cada entidad del contrato con todos sus campos obligatorios', () => {
  for (const [entidad, campos] of Object.entries(CONTRATO)) {
    const definicion = esquemaCatalogo.$defs[entidad];
    assert.ok(definicion, `falta la entidad ${entidad}`);
    assert.deepEqual([...definicion.required].sort(), [...campos].sort(), entidad);
  }
  const opcionales = esquemaCatalogo.$defs.Promocion.properties;
  for (const campo of ['ocasiones', 'nivelPrecio', 'sucursales']) assert.ok(opcionales[campo], `Promoción.${campo}`);
});

test('un catálogo completo según el contrato es válido', () => {
  assert.deepEqual(validarEsquema(catalogoMinimo()), []);
});

const INVALIDOS = [
  ['ocasión con un valor fuera de la rúbrica', c => { c.comercios[0].ocasiones.salir = 0.3; }],
  ['ocasión fuera del vocabulario', c => { c.comercios[0].ocasiones.mascotas = 1; }],
  ['afinarPor no permitido', c => { c.comercios[0].afinarPor = 'marca'; }],
  ['nivel de precio fuera de 1 a 3', c => { c.comercios[0].nivelPrecio = 4; }],
  ['nivel de precio de la promoción fuera de 1 a 3', c => { c.promociones[0].nivelPrecio = 0; }],
  ['canal desconocido', c => { c.promociones[0].canales = ['tienda']; }],
  ['promoción sin canales', c => { c.promociones[0].canales = []; }],
  ['tipo de beneficio desconocido', c => { c.promociones[0].tipoBeneficio = 'regalo'; }],
  ['tarjeta desconocida', c => { c.promociones[0].beneficios[0].tarjeta = 'oro'; }],
  ['promoción sin beneficios', c => { c.promociones[0].beneficios = []; }],
  ['compra mínima negativa', c => { c.promociones[0].beneficios[0].compraMinima = -1; }],
  ['foto con URL externa', c => { c.promociones[0].imagen = 'https://example.com/foto.webp'; }],
  ['logo fuera de /recursos/comercios', c => { c.comercios[0].logo = '/img/logo.svg'; }],
  ['icono de categoría fuera de /recursos/categorias', c => { c.categorias[0].icono = 'restaurantes.svg'; }],
  ['día fuera de domingo a sábado', c => { c.promociones[0].dias = [7]; }],
  ['fecha con otro formato', c => { c.promociones[0].vigencia.hasta = '31/12/2026'; }],
  ['zona sin centro', c => { delete c.zonas[0].centro; }],
  ['estado de cobertura desconocido', c => { c.cobertura[0].estado = 'quizas'; }],
  ['texto obligatorio vacío', c => { c.promociones[0].titulo = ' '; }],
  ['campo no previsto en el contrato', c => { c.promociones[0].popularidad = 10; }],
  ['sin la tabla de relaciones', c => { delete c.relaciones; }]
];

for (const [caso, alterar] of INVALIDOS) {
  test(`el esquema rechaza: ${caso}`, () => {
    const catalogo = catalogoMinimo();
    alterar(catalogo);
    assert.ok(validarEsquema(catalogo).length > 0);
  });
}
