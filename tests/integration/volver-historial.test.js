import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirDetalle, abrirGuardadas } from './pagina-promociones.js';

// SCRUM-142: «Volver al listado» y la flecha de Guardadas regresan en el historial en vez de apilar otra entrada.
test('el detalle vuelve al listado por el historial', async () => {
  const p = await abrirDetalle();
  assert.ok(p.volverPorHistorial.includes(p.obtener('#back-to-list')));
});

test('la flecha de Guardadas vuelve a Para ti por el historial', async () => {
  const p = await abrirGuardadas();
  assert.ok(p.volverPorHistorial.includes(p.obtener('.pr-volver')));
});

test('al restaurarse con Atrás, Promociones relee las guardadas que cambiaron fuera de ella', async () => {
  let ids = [];
  let lecturas = 0;
  const p = await abrirListado({ fetch: async () => { lecturas += 1; return { ok: true, status: 200, json: async () => ({ ids }) }; } });
  const tienda = p.cards.hijos[1].querySelector('.guardar-promo');
  assert.equal(tienda.textContent, 'Guardar');
  const antes = lecturas;
  await p.ventana.pageshow({ persisted: false });
  assert.equal(lecturas, antes, 'una carga normal ya leyó las guardadas');
  ids = ['tienda'];
  await p.ventana.pageshow({ persisted: true });
  assert.equal(tienda.textContent, 'Quitar');
  assert.equal(p.obtener('#pr-contador-guardadas').textContent, '1');
});
