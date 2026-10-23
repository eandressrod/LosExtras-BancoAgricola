import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirDetalle, abrirGuardadas, parametro, almacen } from './pagina-promociones.js';

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
  assert.equal(p.consultas.at(-1), `/api/para-ti?comercio=sImAn&${BASICA_A}`);
  assert.equal(p.history.url, '/promociones.html?comercio=sImAn');
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-tienda']);
  assert.equal(p.obtener('#clear-search').hidden, false);

  await p.obtener('#clear-search').click();
  assert.equal(p.obtener('#merchant-search').value, '');
  assert.equal(p.obtener('#clear-search').hidden, true);
  assert.equal(p.consultas.at(-1), `/api/para-ti?${BASICA_A}`);
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

  assert.equal(p.consultas.at(-1), '/api/para-ti?categoria=Compras&hoy=1&comercio=Siman&tarjeta=cta-a-4');
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
  assert.deepEqual(p.consultas, ['/api/para-ti?tarjeta=cta-b-2']);
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

// ── Casos específicos de Guardadas (H10 – CDA 5) ───────────────────────────

const GUARDADAS_MOCK = [
  { id: 'siman-black', merchant: 'Siman', benefit: '25%', applicableCard: 'black', category: 'Compras' },
  { id: 'mcdo', merchant: "McDonald's", benefit: '10%', applicableCard: 'basica', category: 'Restaurantes' },
  { id: 'cinemark', merchant: 'Cinemark', benefit: '2×1', applicableCard: 'basica', category: 'Entretenimiento' }
];

function filtrarGuardadas(tarjetaId, comercio) {
  const termino = (comercio ?? '').trim().toLowerCase();
  const visibles = termino
    ? GUARDADAS_MOCK.filter(p => p.merchant.toLowerCase().includes(termino))
    : GUARDADAS_MOCK;
  // Como /api/guardadas: ids son todas las guardadas y sinCoincidencias solo describe la tarjeta, no la búsqueda.
  return { ids: GUARDADAS_MOCK.map(p => p.id), promociones: visibles, sinCoincidencias: false };
}

test('H10 Guardadas: búsqueda delega en la API y la lista muestra solo coincidencias', async () => {
  const p = await abrirGuardadas({ consultarGuardadas: filtrarGuardadas });
  assert.equal(p.enlaces().length, 3);

  await p.obtener('#merchant-search').input('Siman');
  // El comercio se pasó a consultarGuardadas como segundo argumento (API source of truth).
  assert.ok(p.consultas.some(q => q.includes('comercio=Siman')), `Consultas: ${p.consultas}`);
  assert.equal(p.enlaces().length, 1);
  assert.equal(p.obtener('#clear-search').hidden, false);
});

test('H10 Guardadas: limpiar buscador restaura el listado completo', async () => {
  const p = await abrirGuardadas({ consultarGuardadas: filtrarGuardadas });
  await p.obtener('#merchant-search').input('Cinemark');
  assert.equal(p.enlaces().length, 1);

  await p.obtener('#clear-search').click();
  assert.equal(p.obtener('#merchant-search').value, '');
  assert.equal(p.obtener('#clear-search').hidden, true);
  assert.equal(p.enlaces().length, 3);
});

test('H10 Guardadas: sin coincidencias muestra estado vacío y permite limpiar', async () => {
  const p = await abrirGuardadas({ consultarGuardadas: filtrarGuardadas });
  await p.obtener('#merchant-search').input('Zara');
  assert.equal(p.enlaces().length, 0);
  assert.equal(p.obtener('#empty-search').hidden, false);
  assert.equal(p.obtener('#empty-filter').hidden, true);
  assert.equal(p.obtener('#empty-none').hidden, true);

  const limpiar = p.obtener('#clear-search-empty');
  assert.equal(limpiar.hidden, false);
  await limpiar.click();
  assert.equal(p.obtener('#merchant-search').value, '');
  assert.equal(p.enlaces().length, 3);
  assert.equal(p.obtener('#empty-search').hidden, true);
  assert.equal(p.obtener('#clear-search-empty').hidden, true);
});

test('H10 Guardadas: sin promociones guardadas, buscar sigue indicando que no hay guardadas', async () => {
  const p = await abrirGuardadas({ consultarGuardadas: () => ({ ids: [], promociones: [], sinCoincidencias: false }) });
  await p.obtener('#merchant-search').input('Siman');
  assert.equal(p.obtener('#empty-none').hidden, false);
  assert.equal(p.obtener('#empty-search').hidden, true);
  assert.equal(p.obtener('#clear-search-empty').hidden, true);
});

test('H10 Guardadas: si ninguna guardada aplica a la tarjeta, buscar no lo presenta como búsqueda sin resultados', async () => {
  const p = await abrirGuardadas({ consultarGuardadas: () => ({ ids: ['siman-black'], promociones: [], sinCoincidencias: true }) });
  await p.obtener('#merchant-search').input('Siman');
  assert.equal(p.obtener('#empty-filter').hidden, false);
  assert.equal(p.obtener('#empty-search').hidden, true);
});

test('H10 Guardadas: el link de detalle incluye desde=guardadas y comercio al haber búsqueda', async () => {
  const p = await abrirGuardadas({ consultarGuardadas: filtrarGuardadas });
  await p.obtener('#merchant-search').input('Siman');
  const href = p.enlaces()[0].href;
  assert.ok(href.includes('desde=guardadas'), `href: ${href}`);
  assert.ok(href.includes('comercio=Siman'), `href: ${href}`);
});

test('H10 Guardadas: al volver desde detalle con desde=guardadas&comercio=... el buscador se restaura', async () => {
  const p = await abrirGuardadas({
    search: '?comercio=Siman',
    consultarGuardadas: filtrarGuardadas
  });
  assert.equal(p.obtener('#merchant-search').value, 'Siman');
  assert.equal(p.enlaces().length, 1);
  // El historial fue actualizado con el perfil (CDA 5).
  assert.ok(p.history.url?.includes('comercio=Siman') || p.history.state?.perfil, `history: ${JSON.stringify(p.history)}`);
});

test('H10 Guardadas: cambiar de perfil limpia la búsqueda y no arrastra datos del perfil anterior (CDA 5)', async () => {
  const p = await abrirGuardadas({
    search: '?comercio=Siman',
    estado: { perfil: 'A' },
    perfil: 'B',
    consultarGuardadas: filtrarGuardadas
  });
  // Perfil distinto: la URL tenía comercio del perfil A; debe descartarse.
  assert.equal(p.obtener('#merchant-search').value, '');
  // El historial debe registrar el perfil B.
  assert.equal(p.history.state?.perfil, 'B');
});

test('H10 Guardadas: un fallo al cargar permite reintentar conservando el texto', async () => {
  let falla = false;
  const p = await abrirGuardadas({
    consultarGuardadas: (tarjetaId, comercio) => {
      if (falla) throw new Error('No se pudieron cargar las promociones guardadas. Intenta de nuevo.');
      return filtrarGuardadas(tarjetaId, comercio);
    }
  });
  falla = true;
  await p.obtener('#merchant-search').input('Siman');
  assert.equal(p.obtener('#list-status').className, 'error');
  assert.equal(p.obtener('#retry').hidden, false);
  assert.equal(p.obtener('#merchant-search').value, 'Siman');

  falla = false;
  await p.obtener('#retry').click();
  assert.equal(p.obtener('#retry').hidden, true);
  assert.equal(p.enlaces().length, 1);
});