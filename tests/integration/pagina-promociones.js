// Arnés compartido (no es un archivo de pruebas): ejecuta las páginas reales de "Para ti" y del detalle,
// sin sus imports, con un DOM mínimo y respuestas controladas. Lo usan las pruebas de H5 y H16.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as filtro from '../../public/js/filtro-categoria.js';
import * as tarjeta from '../../public/js/tarjeta-elegida.js';
import { cardName } from '../../public/js/comun.js';
import { conIndicador } from '../../public/js/transiciones.js';
import { destinoEntradaPromociones } from '../../public/js/menu-modelo.js';
import { textoDisponibleHoy, textoVencePronto, hoyEnElSalvador } from '../../public/js/promocion-vista.js';
import { diapositivasFranja } from '../../public/js/franja.js';
import * as instantanea from '../../public/js/instantanea.js';

export const CATEGORIAS = ['Restaurantes', 'Compras', 'Entretenimiento'].map((id, orden) => ({ id, nombre: id, orden }));
export const TARJETAS = {
  A: [
    { id: 'cta-a-3', tipoTarjeta: 'basica', nombre: 'Tarjeta de Crédito Básica', numeroEnmascarado: '•••• 4821', predeterminada: true },
    { id: 'cta-a-4', tipoTarjeta: 'black', nombre: 'Tarjeta de Crédito Black', numeroEnmascarado: '•••• 7754', predeterminada: false }
  ],
  B: [{ id: 'cta-b-2', tipoTarjeta: 'black', nombre: 'Tarjeta de Crédito Black', numeroEnmascarado: '•••• 0341', predeterminada: true }]
};
export const PROMOS = {
  todas: [{ id: 'restaurante', category: 'Restaurantes' }, { id: 'tienda', category: 'Compras' }, { id: 'cine', category: 'Entretenimiento' }],
  Restaurantes: [{ id: 'restaurante', category: 'Restaurantes' }],
  Compras: [{ id: 'tienda', category: 'Compras' }],
  Entretenimiento: []
};
export const parametro = (url, nombre) => new URL(url, 'http://localhost').searchParams.get(nombre);

const fuente = async archivo => (await readFile(new URL(`../../public/js/${archivo}`, import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '');
const vista = {
  textoVigencia: () => '', textoDisponibleHoy, textoVencePronto, hoyEnElSalvador,
  mostrarImagen: () => {}, mostrarCondiciones: () => {}, mostrarDias: () => {}
};
const NOMBRES = { A: 'Usuario A', B: 'Usuario B', demo: 'Usuario' };

export function elemento(extra = {}) {
  return {
    hidden: false, textContent: '', value: '', className: '', id: '', href: '', type: '', dataset: {}, attributes: {}, listeners: {},
    classList: { valores: new Set(), add(valor) { this.valores.add(valor); }, contains(valor) { return this.valores.has(valor); } },
    addEventListener(tipo, accion) { this.listeners[tipo] = accion; },
    click() { return this.listeners.click?.(); },
    input(valor) { this.value = valor; return this.listeners.input?.({ target: this }); },
    setAttribute(nombre, valor) { this.attributes[nombre] = String(valor); },
    removeAttribute(nombre) { delete this.attributes[nombre]; },
    ...extra
  };
}

export function almacen(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    get length() { return datos.size; },
    key: indice => [...datos.keys()][indice] ?? null,
    getItem: clave => datos.get(clave) ?? null,
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
    removeItem: clave => { datos.delete(clave); }
  };
}

function navegador({ search = '', hash = '', estado = null, perfil = 'A', sesion = almacen(), alRevelar = () => {} } = {}) {
  const elementos = new Map();
  const obtener = selector => {
    if (!elementos.has(selector)) elementos.set(selector, elemento());
    return elementos.get(selector);
  };
  const location = { search, hash, href: '/pagina' + search + hash, replace(url) { this.destino=url; } };
  const history = { state: estado, url: null, replaceState(nuevo, _titulo, url) {
    this.state = nuevo; this.url = url;
    if (typeof url === 'string') {
      const pregunta = url.indexOf('?');
      const numeral = url.indexOf('#');
      location.search = pregunta < 0 ? '' : url.slice(pregunta, numeral < 0 ? undefined : numeral);
    }
  } };
  // Timers falsos: ejecutan el callback de forma inmediata para que el debounce no introduzca
  // retardos asíncronos entre contextos VM que no se puedan awaitar desde el host.
  let timerIdActual = 0;
  const timerFake = { flush: async () => {} }; // no-op; las callbacks ya se ejecutan solas
  const contexto = {
    URLSearchParams,
    location,
    history,
    setTimeout: (fn, _ms) => { ++timerIdActual; Promise.resolve().then(() => fn()); return timerIdActual; },
    clearTimeout: (_id) => { /* no se puede cancelar una microtarea ya encolada */ },
    requireSession: async ({revelar=true}={}) => {
      if(revelar) alRevelar();
      return { id: perfil, nombre: NOMBRES[perfil], tipoTarjeta: perfil === 'B' ? 'black' : 'basica' };
    },
    almacenSesion: () => sesion,
    cardName,
    revelarPagina: alRevelar,
    conIndicador:(indicador,operacion)=>conIndicador(indicador,operacion,{esperar:async()=>{}}), conMinimoCarga:async f=>f(), destinoEntradaPromociones,
    ...vista, ...filtro, ...tarjeta, ...instantanea
  };
  return { obtener, history, contexto, elementos, sesion, timerFake };
}

export async function abrirListado(opciones = {}) {
  const nav = navegador(opciones);
  const perfil = opciones.perfil ?? 'A';
  const todas = elemento({ dataset: { category: '' }, textContent: 'Todas' });
  const conHijos = extra => elemento({ hijos: [], append(nodo) { this.hijos.push(nodo); }, ...extra });
  const filtros = conHijos();
  const opcionesTarjeta = conHijos();
  const cards = conHijos({ replaceChildren() { this.hijos = []; } });
  nav.elementos.set('#category-filter', filtros);
  nav.elementos.set('#card-options', opcionesTarjeta);
  nav.elementos.set('#card-choice', elemento({ hidden: true }));
  nav.elementos.set('#card-single', elemento({ hidden: true }));
  nav.elementos.set('#cards', cards);
  nav.elementos.set('#promotion-card', { content: { cloneNode() {
    const partes = new Map();
    return { querySelector(selector) { if (!partes.has(selector)) partes.set(selector, elemento()); return partes.get(selector); } };
  } } });
  const consultas = [];
  // Sistema visual: se registran los avisos y los carruseles que pide la página; sus componentes tienen pruebas unitarias.
  const aviso = { mostrados: [], mostrar(datos) { this.mostrados.push(datos); }, cerrar() {} };
  const franja = { montajes: [], paradas: 0 };
  const pedidas = { categorias: 0, tarjetas: 0, aperturas: 0 };
  const categorias = opciones.categorias ?? (() => CATEGORIAS);
  const tarjetas = opciones.tarjetas ?? (() => TARJETAS[perfil] ?? []);
  const responder = opciones.responder ?? (url => PROMOS[parametro(url, 'categoria') ?? 'todas']);
  Object.assign(nav.contexto, {
    registrarAperturaPromociones: async () => { pedidas.aperturas++; },
    crearAviso: () => aviso,
    diapositivasFranja,
    montarCarrusel: (_raiz, diapositivas) => { franja.montajes.push(diapositivas); return { parar() { franja.paradas += 1; } }; },
    document: {
      body: { dataset: {} },
      querySelector: nav.obtener,
      querySelectorAll: selector => selector === '.filter-chip' ? [todas] : [],
      getElementById: () => null,
      createElement: tagName => elemento({ tagName })
    },
    getJSON: async url => {
      if (url === '/api/preferencias') return opciones.preferencias();
      if (url === '/api/categorias') { pedidas.categorias += 1; return categorias(); }
      if (url === '/api/tarjetas') { pedidas.tarjetas += 1; return tarjetas(); }
      consultas.push(url);
      // H22: /api/para-ti responde un sobre; las pruebas anteriores siguen describiendo solo la lista.
      const datos = await responder(url);
      return Array.isArray(datos) ? { version: 'prueba', estrategia: 'base', vacio: datos.length ? null : 'filtros', promociones: datos } : datos;
    }
  });
  await vm.runInNewContext(`(async () => { ${await fuente('promociones.js')} })()`, nav.contexto);
  const chips = () => [todas, ...filtros.hijos];
  const pulsados = lista => lista.filter(boton => boton.attributes['aria-pressed'] === 'true').map(boton => boton.textContent);
  // Envuelve obtener para que input() espere a que las microtareas del debounce completen
  // (el setTimout fake encola via Promise.resolve; setImmediate del host las deja ejecutar).
  const esperarMicrotareas = () => new Promise(r => setImmediate(r));
  const obtenerConFlush = selector => {
    const el = nav.obtener(selector);
    const inputOriginal = el.input.bind(el);
    const clickOriginal = el.click.bind(el);
    el.input = async valor => { const r = await inputOriginal(valor); await esperarMicrotareas(); return r; };
    el.click = async () => { const r = await clickOriginal(); await esperarMicrotareas(); return r; };
    return el;
  };
  return {
    ...nav, cards, consultas, pedidas, chips, aviso, franja,
    obtener: obtenerConFlush,
    activo: () => pulsados(chips()),
    chip: nombre => chips().find(chip => chip.textContent === nombre),
    enlaces: () => cards.hijos.map(oferta => oferta.querySelector('a')),
    opciones: () => opcionesTarjeta.hijos,
    tarjetaActiva: () => pulsados(opcionesTarjeta.hijos),
    opcion: texto => opcionesTarjeta.hijos.find(opcion => opcion.textContent === texto)
  };
}

export async function abrirDetalle(opciones = {}) {
  const nav = navegador(opciones);
  const consultas = [];
  Object.assign(nav.contexto, {
    fetch: opciones.fetch,
    document: { querySelector: nav.obtener, title: '', body: { dataset: {} } },
    getJSON: async url => {
      consultas.push(url);
      if (opciones.falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
      const black = parametro(url, 'tarjeta') === 'cta-a-4';
      return { id: 'tienda', merchant: 'Siman', benefit: black ? '25 % de descuento' : '15 % de descuento', applicableCard: black ? 'black' : 'basica', ...opciones.promocion };
    }
  });
  await vm.runInNewContext(`(async () => { ${await fuente('detalle.js')} })()`, nav.contexto);
  return { ...nav, consultas, volver: () => nav.obtener('#back-to-list').href };
}

/**
 * Abre la página de Guardadas con un DOM y fetch controlados.
 * @param {object} opciones
 * @param {string}   [opciones.search]           Query string inicial (e.g. '?comercio=Siman')
 * @param {object}   [opciones.estado]            Estado inicial de history
 * @param {string}   [opciones.perfil]            'A' | 'B'
 * @param {object}   [opciones.sesion]            Almacén de sesión simulado
 * @param {Function} [opciones.consultarGuardadas] Mock de consultarGuardadas(tarjetaId, comercio)
 */
export async function abrirGuardadas(opciones = {}) {
  const nav = navegador(opciones);
  const perfil = opciones.perfil ?? 'A';
  const conHijos = extra => elemento({ hijos: [], append(nodo) { this.hijos.push(nodo); }, ...extra });
  const cards = conHijos({ replaceChildren() { this.hijos = []; } });
  nav.elementos.set('#cards', cards);
  nav.elementos.set('#promotion-card', { content: { cloneNode() {
    const partes = new Map();
    return { querySelector(selector) { if (!partes.has(selector)) partes.set(selector, elemento()); return partes.get(selector); } };
  } } });
  const consultas = [];
  const tarjetas = opciones.tarjetas ?? (() => TARJETAS[perfil] ?? []);
  const responderGuardadas = opciones.consultarGuardadas ?? ((_tarjetaId, comercio) => {
    const termino = (comercio ?? '').toLowerCase();
    const promos = PROMOS.todas.map(p => ({ ...p, merchant: p.id, benefit: '10%', applicableCard: 'basica' }));
    return { promociones: termino ? promos.filter(p => p.merchant.includes(termino)) : promos, sinCoincidencias: false };
  });
  Object.assign(nav.contexto, {
    document: { querySelector: nav.obtener, body: { dataset: {} } },
    getJSON: async url => {
      if (url === '/api/tarjetas') return tarjetas();
      consultas.push(url);
      return null;
    },
    consultarGuardadas: async (tarjetaId, comercio) => {
      consultas.push(`/api/guardadas?tarjeta=${tarjetaId ?? ''}&comercio=${comercio ?? ''}`);
      return responderGuardadas(tarjetaId, comercio);
    },
    marcarBoton: () => {},
    alPulsarGuardar: () => {},
    textoVigencia: () => '',
    mostrarImagen: () => {},
    mostrarCondiciones: () => {},
    mostrarDias: () => {},
    leerTarjetaElegida: (storage, perfilId) => storage.getItem('los-extras-tarjeta:' + perfilId),
    tarjetaActiva: (lista, id) => lista.find(t => t.id === id) ?? lista.find(t => t.predeterminada) ?? lista[0] ?? null,
    cardName
  });
  await vm.runInNewContext(`(async () => { ${await fuente('guardadas.js')} })()`, nav.contexto);
  const esperarMicrotareas = () => new Promise(r => setImmediate(r));
  const obtenerConFlush = selector => {
    const el = nav.obtener(selector);
    const inputOriginal = el.input.bind(el);
    const clickOriginal = el.click.bind(el);
    el.input = async valor => { const r = await inputOriginal(valor); await esperarMicrotareas(); return r; };
    el.click = async () => { const r = await clickOriginal(); await esperarMicrotareas(); return r; };
    return el;
  };
  return {
    ...nav, cards, consultas,
    obtener: obtenerConFlush,
    enlaces: () => cards.hijos.map(oferta => oferta.querySelector('a'))
  };
}
