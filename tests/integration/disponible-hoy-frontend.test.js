import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirDetalle, PROMOS, parametro } from './pagina-promociones.js';

// H17 en las páginas reales de "Para ti" y del detalle. A consulta con su Básica cta-a-3 por defecto.
const BASICA_A = 'tarjeta=cta-a-3';
const hoyActivo = p => p.obtener('#today-filter').attributes['aria-pressed'];

test('H17 Para ti abre con el listado habitual y Disponibles hoy apagado', async () => {
  const p = await abrirListado();
  assert.deepEqual(p.consultas, [`/api/promociones?${BASICA_A}`]);
  assert.equal(hoyActivo(p), 'false');
  assert.equal(p.history.url, '/promociones.html');
});

test('H17 activar Disponibles hoy lo marca, consulta solo lo de hoy y lo lleva al detalle; apagarlo vuelve al listado habitual', async () => {
  const p = await abrirListado();
  await p.obtener('#today-filter').click();
  assert.equal(p.consultas.at(-1), `/api/promociones?hoy=1&${BASICA_A}`);
  assert.equal(hoyActivo(p), 'true');
  assert.equal(p.history.url, '/promociones.html?hoy=1');
  assert.deepEqual(p.history.state, { perfil: 'A', categoria: null });
  assert.deepEqual(p.enlaces().map(enlace => enlace.href), ['/detalle.html?id=restaurante&hoy=1', '/detalle.html?id=tienda&hoy=1', '/detalle.html?id=cine&hoy=1']);
  await p.obtener('#today-filter').click();
  assert.equal(p.consultas.at(-1), `/api/promociones?${BASICA_A}`);
  assert.equal(hoyActivo(p), 'false');
  assert.equal(p.history.url, '/promociones.html');
  assert.ok(p.consultas.every(url => !url.startsWith('/api/preferencias')));
});

test('H17 se combina con la categoría y con la tarjeta elegida', async () => {
  const p = await abrirListado({ search: '?categoria=Compras&hoy=1' });
  assert.deepEqual(p.consultas, [`/api/promociones?categoria=Compras&hoy=1&${BASICA_A}`]);
  assert.deepEqual(p.activo(), ['Compras']);
  assert.equal(hoyActivo(p), 'true');
  await p.chip('Restaurantes').click();
  assert.equal(p.consultas.at(-1), `/api/promociones?categoria=Restaurantes&hoy=1&${BASICA_A}`);
  await p.opcion('Black •••• 7754').click();
  assert.equal(p.consultas.at(-1), '/api/promociones?categoria=Restaurantes&hoy=1&tarjeta=cta-a-4');
  assert.equal(p.history.url, '/promociones.html?categoria=Restaurantes&hoy=1');
});

test('H17 al volver del detalle conserva Disponibles hoy y la oferta abierta', async () => {
  const p = await abrirListado({ search: '?hoy=1', hash: '#promo-tienda' });
  assert.deepEqual(p.consultas, [`/api/promociones?hoy=1&${BASICA_A}`]);
  assert.equal(hoyActivo(p), 'true');
  assert.equal(p.history.url, '/promociones.html?hoy=1#promo-tienda');
});

test('H17 otro perfil no hereda Disponibles hoy del usuario anterior', async () => {
  const p = await abrirListado({ search: '?hoy=1', estado: { perfil: 'A', categoria: null }, perfil: 'B' });
  assert.deepEqual(p.consultas, ['/api/promociones?tarjeta=cta-b-2']);
  assert.equal(hoyActivo(p), 'false');
  assert.equal(p.history.url, '/promociones.html');
});

test('H17 sin ofertas para hoy muestra el estado vacío y la salida al listado habitual', async () => {
  const p = await abrirListado({ search: '?hoy=1', responder: url => parametro(url, 'hoy') ? [] : PROMOS.todas });
  assert.equal(p.obtener('#list-status').textContent, 'No hay promociones disponibles hoy para tu perfil.');
  assert.equal(p.obtener('#exit-today').hidden, false);
  assert.equal(p.obtener('#empty-preferences').hidden, true);
  await p.obtener('#exit-today').click();
  assert.equal(p.consultas.at(-1), `/api/promociones?${BASICA_A}`);
  assert.equal(hoyActivo(p), 'false');
  assert.equal(p.obtener('#exit-today').hidden, true);
  assert.equal(p.enlaces().length, 3);
});

test('H17 el estado vacío nombra la categoría elegida', async () => {
  const p = await abrirListado({ search: '?categoria=Compras&hoy=1', responder: () => [] });
  assert.equal(p.obtener('#list-status').textContent, 'No hay promociones de Compras disponibles hoy para tu perfil.');
  assert.equal(p.obtener('#show-all').hidden, false);
  assert.equal(p.obtener('#exit-today').hidden, false);
});

test('H17 un error permite reintentar con Disponibles hoy activo', async () => {
  let falla = true;
  const p = await abrirListado({ search: '?hoy=1', responder: () => {
    if (falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
    return PROMOS.todas;
  } });
  assert.equal(p.obtener('#list-status').className, 'error');
  assert.equal(p.obtener('#retry').hidden, false);
  falla = false;
  await p.obtener('#retry').click();
  assert.deepEqual(p.consultas, [`/api/promociones?hoy=1&${BASICA_A}`, `/api/promociones?hoy=1&${BASICA_A}`]);
  assert.equal(p.obtener('#retry').hidden, true);
  assert.equal(hoyActivo(p), 'true');
});

test('H17 cada tarjeta explica su disponibilidad de hoy cuando la tiene', async () => {
  const p = await abrirListado({ responder: () => [
    { id: 'cine', category: 'Entretenimiento', availableToday: true, usageDays: [1, 2, 3, 4] },
    { id: 'tienda', category: 'Compras', availableToday: false }
  ] });
  const [cine, tienda] = p.cards.hijos.map(oferta => oferta.querySelector('.promo-today'));
  assert.equal(cine.textContent, 'Disponible hoy: es uno de sus días válidos.');
  assert.equal(cine.hidden, false);
  assert.equal(tienda.hidden, true);
});

test('H17 el detalle muestra la misma disponibilidad y vuelve a Disponibles hoy', async () => {
  const p = await abrirDetalle({ search: '?id=tienda&hoy=1', promocion: { availableToday: true, usageDays: null } });
  assert.equal(p.history.url, '/detalle.html?id=tienda&hoy=1');
  assert.equal(p.volver(), '/promociones.html?hoy=1#promo-tienda');
  assert.equal(p.obtener('#today').textContent, 'Disponible hoy: aplica todos los días de su vigencia.');
  assert.equal(p.obtener('#today').hidden, false);
  const otro = await abrirDetalle({ search: '?id=tienda&hoy=1', estado: { perfil: 'A', categoria: null }, perfil: 'B' });
  assert.equal(otro.volver(), '/promociones.html#promo-tienda');
  assert.equal(otro.obtener('#today').hidden, true);
});
