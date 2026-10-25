import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirDetalle, abrirGuardadas } from './pagina-promociones.js';
import { hoyEnElSalvador } from '../../public/js/promocion-vista.js';

const clic = boton => boton.onclick({ preventDefault() {}, stopPropagation() {} });
const respuesta = (ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => ({}) });
const enDias = dias => new Date(Date.parse(hoyEnElSalvador()) + dias * 86400000).toISOString().slice(0, 10);

test('guardar en Para ti confirma con un aviso y Deshacer devuelve la promoción a su estado', async () => {
  const p = await abrirListado();
  const boton = p.cards.hijos[0].querySelector('.guardar-promo');
  const metodos = [];
  p.contexto.fetch = async (_url, init = {}) => { metodos.push(init.method); return respuesta(); };

  await clic(boton);
  assert.equal(boton.textContent, 'Quitar');
  const [guardada] = p.aviso.mostrados;
  assert.equal(guardada.texto, 'Promoción guardada.');
  await guardada.alDeshacer();
  assert.equal(boton.textContent, 'Guardar');
  assert.deepEqual(metodos, ['POST', 'DELETE']);
  assert.equal(p.aviso.mostrados.length, 1, 'deshacer no abre otro aviso');

  await clic(boton);
  await clic(boton);
  const quitada = p.aviso.mostrados.at(-1);
  assert.equal(quitada.texto, 'Promoción quitada de Guardadas.');
  await quitada.alDeshacer();
  assert.equal(boton.textContent, 'Quitar');
});

test('si Deshacer falla, la tarjeta conserva su estado y muestra el error', async () => {
  const p = await abrirListado();
  const oferta = p.cards.hijos[0];
  const boton = oferta.querySelector('.guardar-promo');
  p.contexto.fetch = async () => respuesta();
  await clic(boton);
  p.contexto.fetch = async () => respuesta(false);
  await p.aviso.mostrados[0].alDeshacer();
  assert.equal(boton.textContent, 'Quitar');
  assert.equal(oferta.querySelector('.guardar-error').textContent, 'No se pudo actualizar. Intenta de nuevo.');
});

test('cada tarjeta lleva su categoría, si es exclusiva y «Vence en N días» solo con 7 días o menos', async () => {
  const p = await abrirListado({ responder: () => [
    { id: 'pronto', category: 'Compras', validUntil: enDias(3) },
    { id: 'lejos', category: 'Restaurantes', validUntil: '2099-12-31', exclusive: true, applicableCard: 'black' }
  ] });
  const [pronto, lejos] = p.cards.hijos;
  assert.equal(pronto.querySelector('.promo-ending').textContent, 'Vence en 3 días');
  assert.equal(pronto.querySelector('.promo-ending').hidden, false);
  assert.equal(lejos.querySelector('.promo-ending').hidden, true);
  assert.equal(pronto.querySelector('article').dataset.categoria, 'Compras');
  assert.equal(pronto.querySelector('article').dataset.exclusiva, undefined);
  assert.equal(lejos.querySelector('article').dataset.exclusiva, 'si');
  assert.equal(lejos.querySelector('.promo-applicability').dataset.tarjeta, 'black');
});

test('la franja se arma con la lista recibida y la estrategia del motor, y el conteo dice cuántas hay', async () => {
  const p = await abrirListado({ responder: () => ({
    version: 'prueba', estrategia: 'personalizada', vacio: null,
    promociones: [
      { id: 'cine', merchant: 'Cinemark', category: 'Entretenimiento', razon: { tipo: 'comercio', texto: 'Porque elegiste Cinemark' } },
      { id: 'tienda', merchant: 'Siman', category: 'Compras', availableToday: true, discountCap: 15 }
    ]
  }) });
  const montaje = p.franja.montajes.at(-1);
  assert.equal(p.obtener('#franja').hidden, false);
  assert.deepEqual(montaje.map(d => d.tipo), ['ahorro', 'orden']);
  assert.equal(montaje.at(-1).detalle, 'Cinemark');
  assert.equal(p.obtener('#pr-conteo').textContent, '2 promociones');
});

test('sin promociones no hay franja, y al recalcular se detiene el carrusel anterior', async () => {
  let vacia = false;
  const p = await abrirListado({ responder: () => (vacia ? [] : [{ id: 'tienda', category: 'Compras' }]) });
  assert.equal(p.franja.montajes.length, 1);
  vacia = true;
  await p.obtener('#today-filter').click();
  assert.equal(p.obtener('#franja').hidden, true);
  assert.equal(p.franja.paradas, 1);
  assert.equal(p.obtener('#pr-conteo').textContent, '');
});

test('el color de la cabecera sigue a la tarjeta elegida', async () => {
  const b = await abrirListado({ perfil: 'B' });
  assert.equal(b.contexto.document.body.dataset.tarjeta, 'black');
  const a = await abrirListado();
  assert.equal(a.contexto.document.body.dataset.tarjeta, 'basica');
  await a.opcion('Black •••• 7754').click();
  assert.equal(a.contexto.document.body.dataset.tarjeta, 'black');
  assert.deepEqual(a.opciones().map(opcion => opcion.dataset.tipo), ['basica', 'black']);
});

test('el detalle muestra la categoría con su acento, vence pronto y toma el color de la tarjeta de la promoción', async () => {
  const p = await abrirDetalle({ search: '?id=tienda', promocion: { category: 'Compras', categoryName: 'Compras', validUntil: enDias(2), applicableCard: 'black' } });
  const categoria = p.obtener('#category');
  assert.equal(categoria.textContent, 'Compras');
  assert.equal(categoria.dataset.categoria, 'Compras');
  assert.equal(p.obtener('#ending').textContent, 'Vence en 2 días');
  assert.equal(p.obtener('#ending').hidden, false);
  assert.equal(p.obtener('#payment').dataset.tarjeta, 'black');
  assert.equal(p.contexto.document.body.dataset.tarjeta, 'black');
});

test('Guardadas usa la misma tarjeta del sistema y el color de la tarjeta elegida', async () => {
  const p = await abrirGuardadas({ perfil: 'B', consultarGuardadas: () => ({
    promociones: [{ id: 'siman-black', merchant: 'Siman', benefit: '30 %', category: 'Compras', applicableCard: 'black', exclusive: true }],
    sinCoincidencias: false
  }) });
  const [oferta] = p.cards.hijos;
  assert.equal(oferta.querySelector('article').dataset.categoria, 'Compras');
  assert.equal(oferta.querySelector('article').dataset.exclusiva, 'si');
  assert.equal(oferta.querySelector('.promo-applicability').dataset.tarjeta, 'black');
  assert.equal(p.contexto.document.body.dataset.tarjeta, 'black');
});
