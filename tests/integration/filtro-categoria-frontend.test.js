import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as filtro from '../../public/js/filtro-categoria.js';

// Prueba las páginas reales (sin sus imports) con un DOM mínimo y respuestas controladas.
const fuente = async archivo => (await readFile(new URL(`../../public/js/${archivo}`, import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '');
const vista = { textoVigencia: () => '', mostrarImagen: () => {}, mostrarCondiciones: () => {} };
const PROMOS = {
  todas: [{ id: 'restaurante', category: 'Restaurantes' }, { id: 'tienda', category: 'Compras' }, { id: 'cine', category: 'Entretenimiento' }],
  Restaurantes: [{ id: 'restaurante', category: 'Restaurantes' }],
  Compras: [{ id: 'tienda', category: 'Compras' }],
  Entretenimiento: []
};

function elemento(extra = {}) {
  return {
    hidden: false, textContent: '', className: '', id: '', href: '', dataset: {}, attributes: {}, listeners: {},
    classList: { valores: new Set(), add(valor) { this.valores.add(valor); }, contains(valor) { return this.valores.has(valor); } },
    addEventListener(tipo, accion) { this.listeners[tipo] = accion; },
    click() { return this.listeners.click?.(); },
    setAttribute(nombre, valor) { this.attributes[nombre] = String(valor); },
    removeAttribute(nombre) { delete this.attributes[nombre]; },
    ...extra
  };
}

function navegador({ search = '', hash = '', estado = null, perfil = 'A' } = {}) {
  const elementos = new Map();
  const obtener = selector => {
    if (!elementos.has(selector)) elementos.set(selector, elemento());
    return elementos.get(selector);
  };
  const history = { state: estado, url: null, replaceState(nuevo, _titulo, url) { this.state = nuevo; this.url = url; } };
  const contexto = {
    URLSearchParams,
    location: { search, hash, href: '/pagina' + search + hash },
    history,
    requireSession: async () => ({ id: perfil, tipoTarjeta: perfil === 'B' ? 'black' : 'basica' }),
    ...vista, ...filtro
  };
  return { obtener, history, contexto, elementos };
}

async function abrirListado(opciones = {}) {
  const nav = navegador(opciones);
  const chips = ['', 'Restaurantes', 'Compras', 'Entretenimiento'].map(categoria => elemento({ dataset: { category: categoria } }));
  const cards = elemento({ hijos: [], append(nodo) { this.hijos.push(nodo); }, replaceChildren() { this.hijos = []; } });
  nav.elementos.set('#cards', cards);
  nav.elementos.set('#promotion-card', { content: { cloneNode() {
    const partes = new Map();
    return { querySelector(selector) { if (!partes.has(selector)) partes.set(selector, elemento()); return partes.get(selector); } };
  } } });
  const consultas = [];
  const responder = opciones.responder ?? (url => PROMOS[new URL(url, 'http://localhost').searchParams.get('categoria') ?? 'todas']);
  Object.assign(nav.contexto, {
    document: { querySelector: nav.obtener, querySelectorAll: selector => selector === '.filter-chip' ? chips : [], getElementById: () => null },
    getJSON: async url => { consultas.push(url); return responder(url); }
  });
  await vm.runInNewContext(`(async () => { ${await fuente('promociones.js')} })()`, nav.contexto);
  const activo = () => chips.filter(chip => chip.attributes['aria-pressed'] === 'true').map(chip => chip.dataset.category || 'Todas');
  const enlaces = () => cards.hijos.map(tarjeta => tarjeta.querySelector('a'));
  return { ...nav, chips, cards, consultas, activo, enlaces, chip: nombre => chips.find(chip => (chip.dataset.category || 'Todas') === nombre) };
}

test('H5 abre con Todas activo, consulta lo aplicable y marca la entrada del historial con su perfil', async () => {
  const p = await abrirListado();
  assert.deepEqual(p.consultas, ['/api/promociones']);
  assert.deepEqual(p.activo(), ['Todas']);
  assert.deepEqual(p.history.state, { perfil: 'A', categoria: null });
  assert.equal(p.history.url, '/promociones.html');
  assert.equal(p.enlaces().length, 3);
});

test('H5 elegir una categoría la marca activa, consulta con el filtro y lo lleva al detalle', async () => {
  const p = await abrirListado();
  await p.chip('Compras').click();
  assert.equal(p.consultas.at(-1), '/api/promociones?categoria=Compras');
  assert.deepEqual(p.activo(), ['Compras']);
  assert.equal(p.history.url, '/promociones.html?categoria=Compras');
  assert.deepEqual(p.history.state, { perfil: 'A', categoria: 'Compras' });
  assert.deepEqual(p.enlaces().map(enlace => enlace.href), ['/detalle.html?id=tienda&categoria=Compras']);
});

test('H5 al volver del detalle restaura el mismo filtro y su listado', async () => {
  const p = await abrirListado({ search: '?categoria=Compras', hash: '#promo-tienda' });
  assert.deepEqual(p.consultas, ['/api/promociones?categoria=Compras']);
  assert.deepEqual(p.activo(), ['Compras']);
  assert.equal(p.history.url, '/promociones.html?categoria=Compras#promo-tienda');
});

test('H5 otro perfil no hereda el filtro guardado en la entrada del usuario anterior', async () => {
  const p = await abrirListado({ search: '?categoria=Compras', estado: { perfil: 'A', categoria: 'Compras' }, perfil: 'B' });
  assert.deepEqual(p.consultas, ['/api/promociones']);
  assert.deepEqual(p.activo(), ['Todas']);
  assert.equal(p.history.url, '/promociones.html');
  assert.deepEqual(p.history.state, { perfil: 'B', categoria: null });
});

test('H5 sin resultados muestra el estado vacío con Ver todas y Cambiar mis preferencias', async () => {
  const p = await abrirListado({ search: '?categoria=Entretenimiento' });
  assert.match(p.obtener('#list-status').textContent, /No hay promociones de Entretenimiento/);
  assert.equal(p.obtener('#show-all').hidden, false);
  assert.equal(p.obtener('#empty-preferences').hidden, false);
  await p.obtener('#show-all').click();
  assert.equal(p.consultas.at(-1), '/api/promociones');
  assert.deepEqual(p.activo(), ['Todas']);
  assert.equal(p.obtener('#show-all').hidden, true);
  assert.equal(p.obtener('#empty-preferences').hidden, true);
});

test('H5 un error permite reintentar con el mismo filtro', async () => {
  let falla = true;
  const p = await abrirListado({ search: '?categoria=Compras', responder: url => {
    if (falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
    return PROMOS.Compras;
  } });
  assert.equal(p.obtener('#list-status').className, 'error');
  assert.equal(p.obtener('#retry').hidden, false);
  assert.deepEqual(p.activo(), ['Compras']);
  falla = false;
  await p.obtener('#retry').click();
  assert.deepEqual(p.consultas, ['/api/promociones?categoria=Compras', '/api/promociones?categoria=Compras']);
  assert.equal(p.obtener('#retry').hidden, true);
  assert.deepEqual(p.enlaces().map(enlace => enlace.id), ['promo-tienda']);
});

test('H5 una respuesta tardía de otro filtro no reemplaza la categoría elegida', async () => {
  let liberarCompras;
  const p = await abrirListado({ responder: url => {
    const categoria = new URL(url, 'http://localhost').searchParams.get('categoria');
    if (categoria === 'Compras') return new Promise(resolver => { liberarCompras = () => resolver(PROMOS.Compras); });
    return PROMOS[categoria ?? 'todas'];
  } });
  const compras = p.chip('Compras').click();
  await p.chip('Restaurantes').click();
  liberarCompras();
  await compras;
  assert.deepEqual(p.activo(), ['Restaurantes']);
  assert.deepEqual(p.enlaces().map(enlace => enlace.id), ['promo-restaurante']);
});

async function abrirDetalle(opciones = {}) {
  const nav = navegador(opciones);
  const consultas = [];
  Object.assign(nav.contexto, {
    document: { querySelector: nav.obtener, title: '' },
    getJSON: async url => {
      consultas.push(url);
      if (opciones.falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
      return { id: 'tienda', merchant: 'Siman', benefit: '15 % de descuento', applicableCard: 'basica' };
    }
  });
  await vm.runInNewContext(`(async () => { ${await fuente('detalle.js')} })()`, nav.contexto);
  return { ...nav, consultas, volver: () => nav.obtener('#back-to-list').href };
}

test('H5 el detalle vuelve al mismo listado filtrado y al mismo perfil', async () => {
  const p = await abrirDetalle({ search: '?id=tienda&categoria=Compras' });
  assert.deepEqual(p.consultas, ['/api/promocion?id=tienda']);
  assert.equal(p.volver(), '/promociones.html?categoria=Compras#promo-tienda');
  assert.deepEqual(p.history.state, { perfil: 'A', categoria: 'Compras' });
});

test('H5 el detalle no conserva el filtro de otro perfil y, si falla, el retorno mantiene el filtro', async () => {
  const otro = await abrirDetalle({ search: '?id=tienda&categoria=Compras', estado: { perfil: 'A', categoria: 'Compras' }, perfil: 'B' });
  assert.equal(otro.volver(), '/promociones.html#promo-tienda');
  assert.equal(otro.history.url, '/detalle.html?id=tienda');
  const fallido = await abrirDetalle({ search: '?id=tienda&categoria=Compras', falla: true });
  assert.equal(fallido.volver(), '/promociones.html?categoria=Compras');
  assert.equal(fallido.obtener('#retry').hidden, false);
});
