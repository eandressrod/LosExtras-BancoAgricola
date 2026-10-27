import { requireSession, almacenSesion, cardName, getJSON } from './comun.js';
import { textoVigencia, mostrarImagen, mostrarCondiciones, mostrarDias } from './promocion-vista.js';
import { consultarGuardadas, marcarBoton, alPulsarGuardar } from './guardar-promo.js';
import { leerTarjetaElegida, tarjetaActiva } from './tarjeta-elegida.js';

let ultimoDatos = null;
let busqueda = '';
let timerBusqueda = null;

function limpiarTexto(valor) {
  if (typeof valor !== 'string') return '';
  const limpio = valor.trim();
  return limpio.length <= 100 ? limpio : '';
}

function pintarVacio(datos, visibles) {
  const ninguna = document.querySelector('#empty-none');
  const filtro = document.querySelector('#empty-filter');
  const sinBusqueda = document.querySelector('#empty-search');
  const limpiarVacio = document.querySelector('#clear-search-empty');
  const accion = document.querySelector('#empty-action');
  const hayVisibles = visibles.length > 0;
  const vacioPorBusqueda = !hayVisibles && Boolean(busqueda) && datos.ids?.length > 0 && !datos.sinCoincidencias;
  ninguna.hidden = hayVisibles || datos.sinCoincidencias || vacioPorBusqueda;
  filtro.hidden = !datos.sinCoincidencias;
  if (sinBusqueda) sinBusqueda.hidden = !vacioPorBusqueda;
  if (limpiarVacio) limpiarVacio.hidden = !vacioPorBusqueda;
  accion.hidden = hayVisibles || vacioPorBusqueda;
}

function tarjeta(promotion, tarjetaId) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  const link = card.querySelector('a');
  const extra = busqueda ? '&comercio=' + encodeURIComponent(busqueda) : '';
  link.href = '/detalle.html?id=' + encodeURIComponent(promotion.id) + '&desde=guardadas' + extra;
  link.setAttribute('aria-label', `${promotion.merchant}: ${promotion.benefit}. Ver promoción`);
  card.querySelector('h2').textContent = promotion.merchant;
  card.querySelector('.promo-benefit').textContent = promotion.benefit;
  card.querySelector('.promo-description').textContent = promotion.description;
  card.querySelector('.promo-category').textContent = promotion.categoryName || promotion.category;
  card.querySelector('.promo-validity').textContent = textoVigencia(promotion);
  const aplica = card.querySelector('.promo-applicability');
  aplica.textContent = 'Aplica a tu tarjeta ' + (promotion.applicableCard === 'black' ? 'Black' : 'Básica');
  aplica.dataset.tarjeta = promotion.applicableCard === 'black' ? 'black' : 'basica';
  // Sistema visual: acento por categoría y exclusivas Black en oscuro, como en Para ti.
  const articulo = card.querySelector('article');
  articulo.dataset.categoria = promotion.category ?? '';
  if (promotion.exclusive) articulo.dataset.exclusiva = 'si';
  const badge = card.querySelector('.promo-exclusive');
  badge.hidden = !promotion.exclusive;
  badge.textContent = promotion.exclusive ? 'Exclusiva Black' : '';
  mostrarImagen(card.querySelector('.promo-photo'), promotion.imageUrl, promotion.imageAlt);
  mostrarImagen(card.querySelector('.merchant-logo'), promotion.logoUrl);
  mostrarDias(card.querySelector('.promo-cuando'), promotion);
  mostrarCondiciones(card.querySelector('.promo-conditions'), promotion, { dias: false });
  const boton = card.querySelector('.guardar-promo');
  marcarBoton(boton, true);
  alPulsarGuardar(boton, promotion.id, guardada => {
    if (!guardada) loadSaved(tarjetaId);
  });
  return card;
}

// La API ya aplica el filtro de comercio; aquí solo renderizamos lo que llegó.
function renderizarGuardadas(datos, tarjetaId) {
  const cards = document.querySelector('#cards');
  cards.replaceChildren();
  const visibles = datos.promociones;
  for (const promotion of visibles) cards.append(tarjeta(promotion, tarjetaId));
  pintarVacio(datos, visibles);
}

async function loadSaved(tarjetaId) {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  status.textContent = 'Cargando guardadas…';
  status.className = 'note';
  retry.hidden = true;
  cards.replaceChildren();
  document.querySelector('#empty-none').hidden = true;
  document.querySelector('#empty-filter').hidden = true;
  const sinBusqueda = document.querySelector('#empty-search');
  const limpiarVacio = document.querySelector('#clear-search-empty');
  if (sinBusqueda) sinBusqueda.hidden = true;
  if (limpiarVacio) limpiarVacio.hidden = true;
  document.querySelector('#empty-action').hidden = true;
  try {
    // La búsqueda se delega a la API para que sea la única fuente de verdad.
    const datos = await consultarGuardadas(tarjetaId, busqueda || null);
    if (!datos) return;
    ultimoDatos = datos;
    status.textContent = '';
    renderizarGuardadas(datos, tarjetaId);
  } catch (error) {
    status.textContent = error.message;
    status.className = 'error';
    retry.hidden = false;
  }
}

const profile = await requireSession();
if (profile) {
  const searchInput = document.querySelector('#merchant-search');
  const clearSearch = document.querySelector('#clear-search');
  const clearSearchEmpty = document.querySelector('#clear-search-empty');
  if (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined') {
    const mismoPerfil = typeof history === 'undefined' || !history.state?.perfil || history.state.perfil === profile.id;
    busqueda = mismoPerfil ? limpiarTexto(new URLSearchParams(location.search).get('comercio')) : '';
    if (searchInput) searchInput.value = busqueda;
    if (clearSearch) clearSearch.hidden = !busqueda;
  }
  let tarjetaId = leerTarjetaElegida(almacenSesion(), profile.id);
  try {
    const activa = tarjetaActiva(await getJSON('/api/tarjetas'), tarjetaId);
    if (activa) {
      tarjetaId = activa.id;
      const badge = document.querySelector('#session-profile');
      if (badge) badge.textContent = `${profile.nombre} · ${cardName(activa)}`;
    }
  } catch { /* si las tarjetas fallan, la lista sigue con la elección guardada */ }

  // Registrar el perfil en el historial al cargar para evitar arrastre entre sesiones (CDA 5).
  if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
    const url = '/guardadas.html' + (busqueda ? '?comercio=' + encodeURIComponent(busqueda) : '');
    history.replaceState({ perfil: profile.id }, '', url);
  }

  function actualizarBusqueda(texto) {
    if (searchInput) searchInput.value = texto;
    if (clearSearch) clearSearch.hidden = !texto;
    busqueda = limpiarTexto(texto);
    if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
      const url = '/guardadas.html' + (busqueda ? '?comercio=' + encodeURIComponent(busqueda) : '');
      history.replaceState({ perfil: profile.id }, '', url);
    }
    // Debounce: espera 300 ms antes de consultar la API para evitar peticiones con cada tecla.
    if (timerBusqueda != null) clearTimeout(timerBusqueda);
    timerBusqueda = setTimeout(() => {
      timerBusqueda = null;
      loadSaved(tarjetaId);
    }, 300);
  }

  if (searchInput) searchInput.addEventListener('input', () => actualizarBusqueda(searchInput.value));
  if (clearSearch) clearSearch.addEventListener('click', () => actualizarBusqueda(''));
  if (clearSearchEmpty) clearSearchEmpty.addEventListener('click', () => actualizarBusqueda(''));
  document.querySelector('#retry').addEventListener('click', () => loadSaved(tarjetaId));
  await loadSaved(tarjetaId);
}
