import test from 'node:test';
import assert from 'node:assert/strict';
import { promocionesDeFuente, categoriasDeFuente, sucursalesParticipantes } from '../../backend/catalogo.js';
import { catalogoMinimo, vector } from './catalogo-minimo.js';

test('la fuente se adapta a la misma forma que devuelve la consulta de Supabase', () => {
  const [combo] = promocionesDeFuente(catalogoMinimo());
  assert.deepEqual(Object.keys(combo).sort(), ['addedOn', 'beneficios', 'benefit', 'benefitType', 'categoria', 'category', 'channels',
    'comercio', 'conditions', 'decisiveCondition', 'description', 'detailDescription', 'id', 'imageAlt', 'imageUrl', 'instructions',
    'intentTags', 'merchant', 'occasions', 'payment', 'priceLevel', 'restrictions', 'sucursales', 'title', 'usageDays', 'validFrom',
    'validUntil'].sort());
  assert.equal(combo.merchant, "Hamburguesas D'Juan");
  assert.equal(combo.category, 'Restaurantes');
  assert.deepEqual(combo.categoria, { nombre: 'Restaurantes' });
  assert.equal(combo.benefit, '10 % de descuento');
  assert.equal(combo.payment, 'Tarjeta Básica');
  assert.equal(combo.restrictions, 'No acumulable con otras ofertas.');
  assert.deepEqual(combo.channels, ['presencial', 'delivery']);
  assert.equal(combo.benefitType, 'descuento');
  assert.equal(combo.addedOn, '2026-10-01');
  assert.deepEqual(combo.comercio, {
    id: 'hamburguesas', nombre: "Hamburguesas D'Juan", logoUrl: '/recursos/comercios/hamburguesas.png', priceLevel: 1,
    occasions: vector({ 'rapido-practico': 1, salir: 0.5 }), recognizable: true, sensitive: false, refineBy: 'comercio',
    subcategoria: { id: 'comida-rapida', nombre: 'Comida rápida' },
    cobertura: [{ zonaId: 'escalon', estado: 'desconocida' }, { zonaId: 'santa-tecla', estado: 'si' }]
  });
  assert.deepEqual(combo.beneficios[1], {
    tipo_tarjeta: 'black', beneficio: '20 % de descuento', medio_pago: 'Tarjeta Black', restricciones: '', compra_minima: 10, tope_descuento: 5
  });
});

test('sin lista, una promoción presencial participa en todas las sucursales del comercio; con lista, solo en esas', () => {
  const [combo, vitaminas] = promocionesDeFuente(catalogoMinimo());
  assert.deepEqual(combo.sucursales.map(({ sucursal }) => sucursal.id), ['hamburguesas-escalon', 'hamburguesas-santa-tecla']);
  assert.deepEqual(vitaminas.sucursales, [{ sucursal: {
    id: 'farmacia-escalon', nombre: 'Escalón', direccion: 'Calle El Mirador', latitud: 13.7069, longitud: -89.2430, zonaId: 'escalon'
  } }]);
});

test('una promoción sin canal presencial no tiene sucursales participantes', () => {
  const catalogo = catalogoMinimo();
  catalogo.promociones[0].canales = ['delivery'];
  assert.deepEqual(sucursalesParticipantes(catalogo.promociones[0], catalogo.sucursales), []);
});

test('ocasiones y nivel de precio de la promoción solo sobrescriben cuando existen', () => {
  const [combo, vitaminas] = promocionesDeFuente(catalogoMinimo());
  assert.equal(combo.occasions, null);
  assert.equal(combo.priceLevel, null);
  assert.equal(vitaminas.priceLevel, 3);
  assert.deepEqual(vitaminas.comercio.occasions, {});
});

test('las categorías incluyen icono e imagen y sus subcategorías ordenadas por nombre', () => {
  assert.deepEqual(categoriasDeFuente(catalogoMinimo()), [
    { id: 'Restaurantes', nombre: 'Restaurantes', icono_url: '/recursos/categorias/restaurantes.svg', imagen_url: null, orden: 1,
      subcategorias: [{ id: 'comida-rapida', nombre: 'Comida rápida' }, { id: 'pizzerias', nombre: 'Pizzerías' }] },
    { id: 'Salud', nombre: 'Salud', icono_url: '/recursos/categorias/salud.svg', imagen_url: '/recursos/categorias/salud.webp', orden: 2,
      subcategorias: [{ id: 'farmacias', nombre: 'Farmacias' }] }
  ]);
});

test('las adaptaciones devuelven copias que no alteran la fuente', () => {
  const catalogo = catalogoMinimo();
  promocionesDeFuente(catalogo)[0].comercio.cobertura.length = 0;
  categoriasDeFuente(catalogo)[0].subcategorias.length = 0;
  assert.deepEqual(catalogo, catalogoMinimo());
});
