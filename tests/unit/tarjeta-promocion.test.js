// SCRUM-129: una sola tarjeta de promoción y una sola acción Guardar para el listado, Guardadas y el detalle.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const memoria = () => { const datos = new Map(); return { getItem: clave => datos.get(clave) ?? null, setItem: (clave, valor) => datos.set(clave, String(valor)), removeItem: clave => datos.delete(clave) }; };
globalThis.localStorage = memoria();
globalThis.sessionStorage = memoria();
globalThis.document = { createElement: () => ({ textContent: '' }) };
const redirecciones = [];
globalThis.location = { replace: url => redirecciones.push(url) };

const { llenarTarjetaPromocion } = await import('../../public/js/tarjeta-promocion.js');
const { cambiarGuardada, alPulsarGuardar, marcarBoton } = await import('../../public/js/guardar-promo.js');

function nodo() {
  return { hidden: false, textContent: '', href: '', dataset: {}, attributes: {}, children: [],
    setAttribute(nombre, valor) { this.attributes[nombre] = valor; }, addEventListener() {},
    replaceChildren() { this.children = []; }, append(hijo) { this.children.push(hijo); } };
}
const COMUNES = ['a', 'article', 'h2', '.promo-benefit', '.promo-description', '.promo-category', '.promo-validity', '.promo-applicability',
  '.promo-exclusive', '.promo-photo', '.merchant-logo', '.promo-cuando', '.promo-conditions'];
const SOLO_LISTADO = ['.promo-ending', '.promo-reason', '.promo-badges', '.promo-expired', '.promo-otras'];
function plantilla(selectores) {
  const partes = new Map(selectores.map(selector => [selector, nodo()]));
  return { partes, querySelector: selector => partes.get(selector) ?? null };
}
const promo = { id: 'tienda', merchant: 'Siman', benefit: '15 % de descuento', description: 'Artículos seleccionados', category: 'Compras',
  categoryName: 'Compras', applicableCard: 'basica', exclusive: false, razon: { texto: 'Por tu interés en Compras' }, vencida: true };

test('SCRUM-129 la misma función llena la tarjeta del listado y la de Guardadas', () => {
  const listado = plantilla([...COMUNES, ...SOLO_LISTADO]);
  const guardadas = plantilla(COMUNES);
  llenarTarjetaPromocion(listado, promo, { href: '/detalle.html?id=tienda', totalTarjetas: 2 });
  llenarTarjetaPromocion(guardadas, promo, { href: '/detalle.html?id=tienda&desde=guardadas' });
  for (const tarjeta of [listado, guardadas]) {
    assert.equal(tarjeta.partes.get('h2').textContent, 'Siman');
    assert.equal(tarjeta.partes.get('.promo-benefit').textContent, '15 % de descuento');
    assert.equal(tarjeta.partes.get('a').attributes['aria-label'], 'Siman: 15 % de descuento. Ver promoción');
    assert.equal(tarjeta.partes.get('article').dataset.categoria, 'Compras');
    assert.equal(tarjeta.partes.get('.promo-exclusive').hidden, true);
  }
  assert.equal(listado.partes.get('a').href, '/detalle.html?id=tienda');
  assert.equal(guardadas.partes.get('a').href, '/detalle.html?id=tienda&desde=guardadas');
  assert.equal(listado.partes.get('.promo-reason').textContent, 'Por tu interés en Compras');
  assert.equal(listado.partes.get('.promo-expired').hidden, false);
  assert.equal(listado.partes.get('.promo-applicability').textContent, 'Solo con tu tarjeta Básica');
  assert.equal(guardadas.partes.get('.promo-applicability').textContent, 'Aplica a tu tarjeta Básica');
});

function boton(guardada) {
  const b = { dataset: {}, textContent: '', disabled: false, parentElement: { querySelector: () => error } };
  const error = { textContent: '' };
  marcarBoton(b, guardada);
  return { b, error };
}
const respuestas = [];
globalThis.fetch = async (url, init) => { respuestas.push(init.method); return { ok: true, status: 200, json: async () => ({}) }; };

test('SCRUM-129 cambiarGuardada guarda o quita según el botón y devuelve el estado nuevo', async () => {
  respuestas.length = 0;
  const { b } = boton(false);
  assert.equal(await cambiarGuardada(b, 'tienda'), true);
  assert.equal(b.textContent, 'Quitar');
  assert.equal(await cambiarGuardada(b, 'tienda'), false);
  assert.equal(b.textContent, 'Guardar');
  assert.deepEqual(respuestas, ['POST', 'DELETE']);
});

test('SCRUM-129 un 401 al guardar vuelve al login con volverAlLogin y no cambia el botón', async () => {
  const anterior = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
  redirecciones.length = 0;
  const { b } = boton(false);
  assert.equal(await cambiarGuardada(b, 'tienda'), null);
  assert.equal(b.textContent, 'Guardar');
  assert.deepEqual(redirecciones, ['/index.html']);
  globalThis.fetch = anterior;
});

test('SCRUM-129 con alPulsarGuardar un segundo toque mientras guarda no envía otra petición', async () => {
  respuestas.length = 0;
  let soltar;
  const anterior = globalThis.fetch;
  globalThis.fetch = async (url, init) => { respuestas.push(init.method); await new Promise(resolver => { soltar = resolver; }); return { ok: true, status: 200, json: async () => ({}) }; };
  const { b } = boton(false);
  const terminadas = [];
  alPulsarGuardar(b, 'tienda', guardada => terminadas.push(guardada));
  const evento = { preventDefault() {}, stopPropagation() {} };
  const primero = b.onclick(evento);
  if (!b.disabled) b.onclick(evento);
  soltar();
  await primero;
  assert.deepEqual(respuestas, ['POST']);
  assert.deepEqual(terminadas, [true]);
  assert.equal(b.disabled, false);
  globalThis.fetch = anterior;
});

test('SCRUM-129 el listado, Guardadas y el detalle no repiten la tarjeta, el Guardar ni la redirección ante un 401', async () => {
  const leer = archivo => readFile(new URL(`../../public/js/${archivo}`, import.meta.url), 'utf8');
  for (const archivo of ['promociones.js', 'guardadas.js', 'detalle.js']) {
    const codigo = await leer(archivo);
    assert.doesNotMatch(codigo, /fetch\('\/api\/guardadas', \{\s*method/, archivo);
    assert.doesNotMatch(codigo, /location\.replace\('\/index\.html'\)/, archivo);
  }
  for (const archivo of ['promociones.js', 'guardadas.js']) {
    const codigo = await leer(archivo);
    assert.match(codigo, /llenarTarjetaPromocion\(/, archivo);
    assert.doesNotMatch(codigo, /querySelector\('\.promo-benefit'\)/, archivo);
  }
});
