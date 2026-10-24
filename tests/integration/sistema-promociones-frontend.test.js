import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado } from './pagina-promociones.js';
import { hoyEnElSalvador } from '../../public/js/promocion-vista.js';

const clic = boton => boton.onclick({ preventDefault() {}, stopPropagation() {} });
const respuesta = (ok = true) => ({ ok, status: ok ? 200 : 503, json: async () => ({}) });

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
  assert.deepEqual(metodos, ['POST', 'DELETE', 'POST', 'DELETE', 'POST']);
});

test('si Deshacer falla, la tarjeta conserva su estado y muestra el error', async () => {
  const p = await abrirListado();
  const oferta = p.cards.hijos[0];
  const boton = oferta.querySelector('.guardar-promo');
  const error = oferta.querySelector('.guardar-error');
  p.contexto.fetch = async () => respuesta();
  await clic(boton);
  p.contexto.fetch = async () => respuesta(false);
  await p.aviso.mostrados[0].alDeshacer();
  assert.equal(boton.textContent, 'Quitar');
  assert.equal(error.textContent, 'No se pudo actualizar. Intenta de nuevo.');
});

test('la tarjeta avisa «Vence en N días» solo con vigencia de 7 días o menos', async () => {
  const hoy = hoyEnElSalvador();
  const enTresDias = new Date(Date.parse(hoy) + 3 * 86400000).toISOString().slice(0, 10);
  const p = await abrirListado({ responder: () => [
    { id: 'pronto', category: 'Compras', validUntil: enTresDias },
    { id: 'lejos', category: 'Compras', validUntil: '2099-12-31' }
  ] });
  const [pronto, lejos] = p.cards.hijos.map(oferta => oferta.querySelector('.promo-ending'));
  assert.equal(pronto.textContent, 'Vence en 3 días');
  assert.equal(pronto.hidden, false);
  assert.equal(lejos.hidden, true);
});
