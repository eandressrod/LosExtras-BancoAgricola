// Arnés compartido (no es un archivo de pruebas): ejecuta las páginas reales de "Para ti" y del detalle,
// sin sus imports, con un DOM mínimo y respuestas controladas. Lo usan las pruebas de H5 y H16.
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as filtro from '../../public/js/filtro-categoria.js';
import * as tarjeta from '../../public/js/tarjeta-elegida.js';
import { cardName } from '../../public/js/comun.js';
import { conIndicador } from '../../public/js/transiciones.js';
import { destinoEntradaPromociones } from '../../public/js/menu-modelo.js';
import { textoDisponibleHoy } from '../../public/js/promocion-vista.js';

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
const vista = { textoVigencia: () => '', textoDisponibleHoy, mostrarImagen: () => {}, mostrarCondiciones: () => {} };
const NOMBRES = { A: 'Usuario A', B: 'Usuario B', demo: 'Usuario' };

export function elemento(extra = {}) {
  return {
    hidden: false, textContent: '', className: '', id: '', href: '', type: '', dataset: {}, attributes: {}, listeners: {},
    classList: { valores: new Set(), add(valor) { this.valores.add(valor); }, contains(valor) { return this.valores.has(valor); } },
    addEventListener(tipo, accion) { this.listeners[tipo] = accion; },
    click() { return this.listeners.click?.(); },
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
  const history = { state: estado, url: null, replaceState(nuevo, _titulo, url) { this.state = nuevo; this.url = url; } };
  const contexto = {
    URLSearchParams,
    location: { search, hash, href: '/pagina' + search + hash, replace(url) { this.destino=url; } },
    history,
    requireSession: async ({revelar=true}={}) => {
      if(revelar) alRevelar();
      return { id: perfil, nombre: NOMBRES[perfil], tipoTarjeta: perfil === 'B' ? 'black' : 'basica' };
    },
    almacenSesion: () => sesion,
    cardName,
    revelarPagina: alRevelar,
    conIndicador:(indicador,operacion)=>conIndicador(indicador,operacion,{esperar:async()=>{}}), conMinimoCarga:async f=>f(), destinoEntradaPromociones,
    ...vista, ...filtro, ...tarjeta
  };
  return { obtener, history, contexto, elementos, sesion };
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
  const pedidas = { categorias: 0, tarjetas: 0, aperturas: 0 };
  const categorias = opciones.categorias ?? (() => CATEGORIAS);
  const tarjetas = opciones.tarjetas ?? (() => TARJETAS[perfil] ?? []);
  const responder = opciones.responder ?? (url => PROMOS[parametro(url, 'categoria') ?? 'todas']);
  Object.assign(nav.contexto, {
    registrarAperturaPromociones: async () => { pedidas.aperturas++; },
    document: {
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
      return responder(url);
    }
  });
  await vm.runInNewContext(`(async () => { ${await fuente('promociones.js')} })()`, nav.contexto);
  const chips = () => [todas, ...filtros.hijos];
  const pulsados = lista => lista.filter(boton => boton.attributes['aria-pressed'] === 'true').map(boton => boton.textContent);
  return {
    ...nav, cards, consultas, pedidas, chips,
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
    document: { querySelector: nav.obtener, title: '' },
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
