import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { abrirDetalle, abrirListado, almacen } from './pagina-promociones.js';
import { cardName } from '../../public/js/comun.js';
import { tarjetaActiva } from '../../public/js/tarjeta-elegida.js';

const clic = boton => boton.onclick({ preventDefault() {}, stopPropagation() {} });

test('Guardadas abre el detalle con la tarjeta elegida y volver regresa allí', async () => {
  let ids = ['siman-black'];
  const p = await abrirDetalle({
    search: '?id=siman-black&desde=guardadas',
    sesion: almacen({ 'los-extras-tarjeta:A': 'cta-a-4' }),
    fetch: async (_url, init = {}) => {
      if (init.method === 'DELETE') {
        ids = [];
        return { ok: true, status: 200, json: async () => ({ guardada: false }) };
      }
      return { ok: true, status: 200, json: async () => ({ ids: [...ids] }) };
    }
  });
  assert.deepEqual(p.consultas, ['/api/promocion?id=siman-black&tarjeta=cta-a-4']);
  assert.equal(p.volver(), '/guardadas.html');
  assert.equal(p.obtener('#back-to-list').textContent, 'Volver a guardadas');
  assert.match(p.history.url, /desde=guardadas/);
  const boton = p.obtener('#guardar-promo');
  assert.equal(boton.textContent, 'Quitar');
  await clic(boton);
  assert.equal(boton.textContent, 'Guardar');
  const alVolver = await p.contexto.fetch('/api/guardadas?tarjeta=cta-a-4');
  assert.deepEqual((await alVolver.json()).ids, []);
  assert.equal(p.volver(), '/guardadas.html');
});

test('el retorno normal desde Para ti conserva categoría y Disponibles hoy', async () => {
  const p = await abrirDetalle({ search: '?id=tienda&categoria=Compras&hoy=1' });
  assert.equal(p.volver(), '/promociones.html?categoria=Compras&hoy=1#promo-tienda');
  assert.equal(p.obtener('#back-to-list').textContent, 'Volver al listado');
  assert.equal(p.history.url.includes('desde=guardadas'), false);
});

test('un fallo al guardar o quitar se ve en la tarjeta ya montada y el reintento no duplica', async () => {
  const p = await abrirListado();
  const oferta = p.cards.hijos[0];
  const boton = oferta.querySelector('.guardar-promo');
  const aviso = oferta.querySelector('.guardar-error');
  oferta.querySelector = () => null;
  const posts = [];
  p.contexto.fetch = async (_url, init = {}) => {
    if (init.method === 'POST') posts.push(JSON.parse(init.body).promocionId);
    if (posts.length === 1) return { ok: false, status: 503, json: async () => ({}) };
    if (posts.length === 2) throw new Error('Sin conexión');
    return { ok: true, status: 200, json: async () => ({ guardada: true }) };
  };
  await clic(boton);
  assert.equal(aviso.textContent, 'No se pudo actualizar. Intenta de nuevo.');
  assert.equal(boton.textContent, 'Guardar');
  await clic(boton);
  assert.equal(aviso.textContent, 'Sin conexión');
  assert.equal(boton.textContent, 'Guardar');
  await clic(boton);
  assert.equal(aviso.textContent, '');
  assert.equal(boton.textContent, 'Quitar');
  assert.deepEqual(posts, ['restaurante', 'restaurante', 'restaurante']);

  let deletes = 0;
  p.contexto.fetch = async (_url, init = {}) => {
    assert.equal(init.method, 'DELETE');
    deletes += 1;
    if (deletes === 1) return { ok: false, status: 503, json: async () => ({}) };
    if (deletes === 2) throw new Error('Sin conexión');
    return { ok: true, status: 200, json: async () => ({ guardada: false }) };
  };
  await clic(boton);
  assert.equal(aviso.textContent, 'No se pudo actualizar. Intenta de nuevo.');
  assert.equal(boton.textContent, 'Quitar');
  await clic(boton);
  assert.equal(aviso.textContent, 'Sin conexión');
  assert.equal(boton.textContent, 'Quitar');
  await clic(boton);
  assert.equal(boton.textContent, 'Guardar');
  assert.equal(deletes, 3);
  assert.equal(posts.length, 3);
});

test('Guardadas consulta la tarjeta elegida en la sesión', async () => {
  const fuente = (await readFile(new URL('../../public/js/guardadas.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '');
  const consultas = [];
  const sesion = almacen({ 'los-extras-tarjeta:A': 'cta-a-4' });
  const partes = new Map();
  const card = { querySelector(selector) {
    if (!partes.has(selector)) partes.set(selector, { hidden: false, textContent: '', href: '', dataset: {}, setAttribute() {} });
    return partes.get(selector);
  } };
  const cards = { hijos: [], append(nodo) { this.hijos.push(nodo); }, replaceChildren() { this.hijos = []; } };
  const badge = { hidden: false, textContent: 'Usuario A · Tarjeta Básica' };
  const elemento = () => ({ hidden: true, textContent: '', className: '', addEventListener() {} });
  await vm.runInNewContext(`(async () => { ${fuente} })()`, {
    requireSession: async () => ({ id: 'A', nombre: 'Usuario A' }),
    almacenSesion: () => sesion,
    cardName,
    tarjetaActiva,
    getJSON: async url => {
      assert.equal(url, '/api/tarjetas');
      return [
        { id: 'cta-a-3', tipoTarjeta: 'basica', predeterminada: true },
        { id: 'cta-a-4', tipoTarjeta: 'black', predeterminada: false }
      ];
    },
    leerTarjetaElegida: (storage, perfilId) => storage.getItem('los-extras-tarjeta:' + perfilId),
    consultarGuardadas: async tarjetaId => {
      consultas.push(tarjetaId);
      return { ids: ['siman-black'], promociones: [{ id: 'siman-black', merchant: 'Siman', benefit: '30 % de descuento', applicableCard: 'black', exclusive: true }], sinCoincidencias: false };
    },
    marcarBoton() {},
    alPulsarGuardar() {},
    textoVigencia: () => '',
    mostrarImagen() {},
    mostrarCondiciones() {},
    document: { querySelector(selector) {
      if (selector === '#cards') return cards;
      if (selector === '#session-profile') return badge;
      if (selector === '#promotion-card') return { content: { cloneNode: () => card } };
      return elemento();
    } }
  });
  assert.equal(badge.textContent, 'Usuario A · Tarjeta Black');
  assert.deepEqual(consultas, ['cta-a-4']);
  assert.equal(cards.hijos[0].querySelector('a').href, '/detalle.html?id=siman-black&desde=guardadas');
  assert.equal(cards.hijos[0].querySelector('.promo-benefit').textContent, '30 % de descuento');
});
