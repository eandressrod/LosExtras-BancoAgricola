import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirDetalle, parametro } from './pagina-promociones.js';

const BASICA_A = 'tarjeta=cta-a-3';
const OFERTAS = [
  { id: 'restaurante', merchant: "McDonald's", category: 'Restaurantes', benefit: '10 %' },
  { id: 'tienda', merchant: 'Siman', category: 'Compras', benefit: '15 %' },
  { id: 'cine', merchant: 'Cinemark', category: 'Entretenimiento', benefit: '2×1' },
  { id: 'starbucks', merchant: 'Starbucks', category: 'Restaurantes', benefit: '10 %' }
];

function filtrarMock(url) {
  const cat = parametro(url, 'categoria');
  const com = (parametro(url, 'comercio') ?? '').trim().toLowerCase();
  return OFERTAS.filter(p => (!cat || p.category === cat) && (!com || p.merchant.toLowerCase().includes(com)));
}

test('H10 escribir nombre filtra ignorando mayúsculas/espacios y borrar restablece el listado', async () => {
  const p = await abrirListado({ responder: filtrarMock });
  assert.equal(p.enlaces().length, 4);

  await p.obtener('#merchant-search').input('  sImAn  ');
  assert.equal(p.consultas.at(-1), `/api/promociones?comercio=sImAn&${BASICA_A}`);
  assert.equal(p.history.url, '/promociones.html?comercio=sImAn');
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-tienda']);
  assert.equal(p.obtener('#clear-search').hidden, false);

  await p.obtener('#clear-search').click();
  assert.equal(p.obtener('#merchant-search').value, '');
  assert.equal(p.obtener('#clear-search').hidden, true);
  assert.equal(p.consultas.at(-1), `/api/promociones?${BASICA_A}`);
  assert.equal(p.enlaces().length, 4);
});

test('H10 sin coincidencias muestra estado vacío y permite limpiar la búsqueda', async () => {
  const p = await abrirListado({ responder: filtrarMock });
  await p.obtener('#merchant-search').input('Zara');
  assert.equal(p.enlaces().length, 0);
  assert.match(p.obtener('#list-status').textContent, /Zara/);
  assert.equal(p.obtener('#clear-search-empty').hidden, false);

  await p.obtener('#clear-search-empty').click();
  assert.equal(p.obtener('#merchant-search').value, '');
  assert.equal(p.obtener('#clear-search-empty').hidden, true);
  assert.equal(p.enlaces().length, 4);
});

test('H10 cada resultado abre su detalle con contexto y al volver conserva texto, categoría, hoy y tarjeta', async () => {
  const p = await abrirListado({ search: '?categoria=Compras&hoy=1', responder: filtrarMock });
  await p.opcion('Black •••• 7754').click();
  await p.obtener('#merchant-search').input('Siman');

  assert.equal(p.consultas.at(-1), '/api/promociones?categoria=Compras&hoy=1&comercio=Siman&tarjeta=cta-a-4');
  assert.deepEqual(p.enlaces().map(e => e.href), ['/detalle.html?id=tienda&categoria=Compras&hoy=1&comercio=Siman']);

  const detalle = await abrirDetalle({
    search: '?id=tienda&categoria=Compras&hoy=1&comercio=Siman',
    sesion: p.sesion
  });
  assert.equal(detalle.volver(), '/promociones.html?categoria=Compras&hoy=1&comercio=Siman#promo-tienda');

  const regreso = await abrirListado({
    search: '?categoria=Compras&hoy=1&comercio=Siman',
    hash: '#promo-tienda',
    sesion: p.sesion,
    responder: filtrarMock
  });
  assert.equal(regreso.obtener('#merchant-search').value, 'Siman');
  assert.deepEqual(regreso.activo(), ['Compras']);
  assert.equal(regreso.obtener('#today-filter').attributes['aria-pressed'], 'true');
  assert.deepEqual(regreso.tarjetaActiva(), ['Black •••• 7754']);
});

test('H10 cambiar de usuario limpia el texto y contexto del perfil anterior', async () => {
  const p = await abrirListado({
    search: '?categoria=Compras&comercio=Siman',
    estado: { perfil: 'A', categoria: 'Compras' },
    perfil: 'B',
    responder: filtrarMock
  });
  assert.equal(p.obtener('#merchant-search').value, '');
  assert.equal(p.history.url, '/promociones.html');
  assert.deepEqual(p.consultas, ['/api/promociones?tarjeta=cta-b-2']);
});

test('H10 un fallo de consulta ofrece reintento conservando el texto escrito', async () => {
  let falla = false;
  const p = await abrirListado({
    responder: url => {
      if (falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
      return filtrarMock(url);
    }
  });
  falla = true;
  await p.obtener('#merchant-search').input('Starbucks');
  assert.equal(p.obtener('#list-status').className, 'error');
  assert.equal(p.obtener('#retry').hidden, false);
  assert.equal(p.obtener('#merchant-search').value, 'Starbucks');

  falla = false;
  await p.obtener('#retry').click();
  assert.equal(p.obtener('#retry').hidden, true);
  assert.equal(p.obtener('#merchant-search').value, 'Starbucks');
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-starbucks']);
});