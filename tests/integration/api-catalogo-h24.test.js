import test from 'node:test';
import assert from 'node:assert/strict';
import promociones, { crearHandlerPromociones } from '../../api/promociones.js';
import detalle from '../../api/promocion.js';
import categorias from '../../api/categorias.js';
import { repositorioMock } from '../../backend/repositorios/mock.js';
import { crearRepositorioSupabase } from '../../backend/repositorios/supabase.js';
import { crearRepositorioPreferenciasUsuario } from '../../backend/repositorios/preferencias.usuario.js';
import { promocionesDeFuente, categoriasDeFuente, sucursalesParticipantes } from '../../backend/catalogo.js';
import { crearToken } from '../../backend/servicios/sesion.js';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h24-pruebas-de-integracion'.repeat(2);

const HOY = new Date('2026-10-21T18:00:00Z');
const pedir = (ruta, perfilId) => new Request('http://localhost' + ruta, { headers: { cookie: `sesion_extras=${crearToken(perfilId)}` } });
async function json(handler, ruta, perfilId) {
  const respuesta = await handler.fetch(pedir(ruta, perfilId));
  assert.equal(respuesta.status, 200, ruta);
  return respuesta.json();
}

const EXISTENTES = ['id', 'merchant', 'category', 'categoryName', 'benefit', 'description', 'payment', 'restrictions', 'imageUrl', 'imageAlt',
  'logoUrl', 'detailDescription', 'validFrom', 'validUntil', 'usageDays', 'applicableCard', 'exclusive', 'minimumPurchase', 'discountCap',
  'expired', 'upcoming', 'canUse', 'availableToday'];
const NUEVOS = ['title', 'conditions', 'instructions', 'generalRestrictions', 'channels', 'benefitType', 'decisiveCondition', 'intentTags',
  'addedOn', 'occasions', 'priceLevel', 'merchantId', 'subcategoryId', 'subcategoryName', 'recognizable', 'sensitive', 'refineBy', 'branches',
  'coverage'];

test('H24 el mock sirve exactamente la fuente única', async () => {
  assert.deepEqual(await repositorioMock.listarPromocionesConBeneficios(), promocionesDeFuente(fuente));
});

test('H24 /api/promociones conserva los campos existentes y agrega los del contrato con los valores de la fuente', async () => {
  const lista = await json(crearHandlerPromociones(undefined, () => HOY), '/api/promociones', 'B');
  const conBlack = fuente.promociones.filter(p => p.beneficios.some(b => b.tarjeta === 'black'));
  assert.deepEqual(lista.map(p => p.id), conBlack.map(p => p.id));
  const comercios = new Map(fuente.comercios.map(c => [c.id, c]));
  const subcategorias = new Map(fuente.subcategorias.map(s => [s.id, s]));
  for (const promo of lista) {
    assert.deepEqual(Object.keys(promo).sort(), [...EXISTENTES, ...NUEVOS].sort(), promo.id);
    const origen = conBlack.find(p => p.id === promo.id);
    const comercio = comercios.get(origen.comercio);
    const black = origen.beneficios.find(b => b.tarjeta === 'black');
    assert.deepEqual({
      title: promo.title, conditions: promo.conditions, instructions: promo.instructions, generalRestrictions: promo.generalRestrictions,
      channels: promo.channels, benefitType: promo.benefitType, decisiveCondition: promo.decisiveCondition, intentTags: promo.intentTags,
      addedOn: promo.addedOn, occasions: promo.occasions, priceLevel: promo.priceLevel, merchantId: promo.merchantId,
      subcategoryId: promo.subcategoryId, subcategoryName: promo.subcategoryName, recognizable: promo.recognizable,
      sensitive: promo.sensitive, refineBy: promo.refineBy, benefit: promo.benefit, restrictions: promo.restrictions, payment: promo.payment
    }, {
      title: origen.titulo, conditions: origen.condiciones, instructions: origen.instrucciones, generalRestrictions: origen.restricciones,
      channels: origen.canales, benefitType: origen.tipoBeneficio, decisiveCondition: origen.condicionDecisiva,
      intentTags: origen.etiquetasIntencion, addedOn: origen.alta, occasions: origen.ocasiones ?? comercio.ocasiones,
      priceLevel: origen.nivelPrecio ?? comercio.nivelPrecio, merchantId: comercio.id, subcategoryId: comercio.subcategoria,
      subcategoryName: subcategorias.get(comercio.subcategoria).nombre, recognizable: comercio.reconocible, sensitive: comercio.sensible,
      refineBy: comercio.afinarPor, benefit: black.beneficio, restrictions: black.restricciones, payment: black.medioPago
    }, promo.id);
    assert.deepEqual(promo.branches, sucursalesParticipantes(origen, fuente.sucursales).map(s => ({
      id: s.id, name: s.nombre, address: s.direccion, latitude: s.coordenadas.latitud, longitude: s.coordenadas.longitud, zoneId: s.zona
    })), promo.id);
    assert.deepEqual(promo.coverage, fuente.cobertura.filter(c => c.comercio === comercio.id)
      .map(c => ({ zoneId: c.zona, status: c.estado })).sort((a, b) => a.zoneId.localeCompare(b.zoneId)), promo.id);
  }
});

test('H24 una promoción sin canal presencial no informa sucursales y el detalle repite los campos del listado', async () => {
  const lista = await json(promociones, '/api/promociones', 'A');
  const remota = lista.find(p => !p.channels.includes('presencial'));
  assert.ok(remota, 'el esqueleto tiene una promoción solo a domicilio o en línea para Básica');
  assert.deepEqual(remota.branches, []);
  for (const promo of [remota, lista.find(p => p.branches.length > 1)]) {
    assert.deepEqual(await json(detalle, '/api/promocion?id=' + promo.id + '&tarjeta=cta-a-3', 'A'), promo, promo.id);
  }
});

test('H24 /api/categorias entrega icono, imagen y subcategorías de la fuente', async () => {
  assert.deepEqual(await json(categorias, '/api/categorias', 'A'), categoriasDeFuente(fuente));
});

test('H24 el adaptador Supabase pide en una sola consulta los campos y relaciones nuevos y los ordena', async () => {
  let consulta;
  const fila = { id: 'p', comercio: { cobertura: [{ zonaId: 'z2', estado: 'si' }, { zonaId: 'z1', estado: 'no' }] },
    sucursales: [{ sucursal: { id: 's2' } }, { sucursal: { id: 's1' } }] };
  const client = { from(tabla) {
    assert.equal(tabla, 'promociones');
    return { select(campos) { consulta = campos; return this; }, order() { return this; },
      then(resolve) { return Promise.resolve({ data: [structuredClone(fila)], error: null }).then(resolve); } };
  } };
  const [promo] = await crearRepositorioSupabase(client).listarPromocionesConBeneficios();
  for (const campo of ['title:titulo', 'conditions:condiciones', 'instructions:instrucciones', 'channels:canales', 'benefitType:tipo_beneficio',
    'decisiveCondition:condicion_decisiva', 'intentTags:etiquetas_intencion', 'addedOn:fecha_alta', 'occasions:ocasiones', 'priceLevel:nivel_precio']) {
    assert.ok(consulta.includes(campo), campo);
  }
  assert.ok(consulta.includes('comercio:comercios(id, nombre, logoUrl:logo_url, priceLevel:nivel_precio, occasions:ocasiones, ' +
    'recognizable:reconocible, sensitive:sensible, refineBy:afinar_por, subcategoria:subcategorias(id, nombre), cobertura(zonaId:zona_id, estado))'), consulta);
  assert.ok(consulta.includes('sucursales:promocion_sucursales(sucursal:sucursales(id, nombre, direccion, latitud, longitud, zonaId:zona_id))'), consulta);
  assert.deepEqual(promo.comercio.cobertura.map(c => c.zonaId), ['z1', 'z2']);
  assert.deepEqual(promo.sucursales.map(s => s.sucursal.id), ['s1', 's2']);
});

test('H24 el repositorio de categorías en Supabase pide icono y subcategorías y las ordena por nombre', async () => {
  let consulta;
  const data = [{ id: 'Salud', nombre: 'Salud', icono_url: '/recursos/categorias/salud.svg', imagen_url: null, orden: 5,
    subcategorias: [{ id: 'opticas', nombre: 'Ópticas' }, { id: 'farmacias', nombre: 'Farmacias' }] }];
  const cliente = { from(tabla) {
    assert.equal(tabla, 'categorias');
    return { select(campos) { consulta = campos; return this; }, order() { return this; },
      then(resolve) { return Promise.resolve({ data: structuredClone(data), error: null }).then(resolve); } };
  } };
  const [salud] = await crearRepositorioPreferenciasUsuario(cliente).obtenerCategorias();
  assert.equal(consulta, 'id, nombre, icono_url, imagen_url, orden, subcategorias(id, nombre)');
  assert.deepEqual(salud.subcategorias.map(s => s.id), ['farmacias', 'opticas']);
});
