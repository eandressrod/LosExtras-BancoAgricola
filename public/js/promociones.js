import { requireSession, getJSON, almacenSesion, cardName, revelarPagina } from './comun.js';
import { textoVigencia, textoDisponibleHoy, textoVencePronto, hoyEnElSalvador, mostrarImagen, mostrarCondiciones, mostrarDias } from './promocion-vista.js';
import { crearAviso } from './aviso-deshacer.js';
import { diapositivasFranja } from './franja.js';
import { montarCarrusel } from './carrusel.js';
import { destinoEntradaPromociones } from './menu-modelo.js';
import { registrarAperturaPromociones } from './usuarios-prueba.js';
import { conIndicador } from './transiciones.js';
import { conMinimoCarga } from './carga-tiempo.js';
import { guardarInstantanea, leerInstantanea, marcarVencidas } from './instantanea.js';

import { leerCategoria, leerHoy, leerBusqueda, normalizarBusqueda, categoriaVigente, estadoNavegacion, urlConsulta, urlListado, urlDetalle } from './filtro-categoria.js';
import { leerTarjetaElegida, guardarTarjetaElegida, tarjetaActiva, etiquetaTarjeta, textoTarjeta, conTarjeta } from './tarjeta-elegida.js';

let idsGuardados = [];
let avisoGuardar = null;

function marcarGuardada(boton, guardada) {
  boton.dataset.guardada = guardada ? 'si' : 'no';
  boton.textContent = guardada ? 'Quitar' : 'Guardar';
}

// Guardar o quitar. Con aviso, el cambio se puede deshacer una vez; deshacer no abre otro aviso.
async function alternarGuardada(boton, error, id, conAviso) {
  error.textContent = '';
  const quitar = boton.dataset.guardada === 'si';
  try {
    const response = await fetch('/api/guardadas', {
      method: quitar ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promocionId: id })
    });
    if (response.status === 401) { location.replace('/index.html'); return; }
    if (!response.ok) throw new Error('No se pudo actualizar. Intenta de nuevo.');
    marcarGuardada(boton, !quitar);
    idsGuardados = quitar ? idsGuardados.filter(guardado => guardado !== id) : [...idsGuardados, id];
    if (conAviso) avisoGuardar.mostrar({
      texto: quitar ? 'Promoción quitada de Guardadas.' : 'Promoción guardada.',
      alDeshacer: async () => {
        await alternarGuardada(boton, error, id, false);
        boton.focus?.();
      }
    });
  } catch (fallo) {
    error.textContent = fallo.message;
  }
}

function crearOferta(promotion, categoria, hoy, busqueda) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  const link = card.querySelector('a');
  link.id = 'promo-' + promotion.id;
  link.href = urlDetalle(promotion.id, categoria, hoy, busqueda);
  link.setAttribute('aria-label', `${promotion.merchant}: ${promotion.benefit}. Ver promoción`);
  // Sistema visual: el acento de la tarjeta sale de su categoría y las exclusivas Black van en oscuro.
  const articulo = card.querySelector('article');
  articulo.dataset.categoria = promotion.category ?? '';
  if (promotion.exclusive) articulo.dataset.exclusiva = 'si';
  card.querySelector('h2').textContent = promotion.merchant;
  card.querySelector('.promo-benefit').textContent = promotion.benefit;
  card.querySelector('.promo-description').textContent = promotion.description;
  card.querySelector('.promo-category').textContent = promotion.categoryName || promotion.category;
  card.querySelector('.promo-validity').textContent = textoVigencia(promotion);
  const vence = card.querySelector('.promo-ending');
  vence.textContent = textoVencePronto(promotion, hoyEnElSalvador());
  vence.hidden = !vence.textContent;
  const disponible = card.querySelector('.promo-today');
  disponible.textContent = textoDisponibleHoy(promotion);
  disponible.hidden = !disponible.textContent;
  // H22: una sola razón del motor; los criterios declarados solo como insignias.
  const razon = card.querySelector('.promo-reason');
  razon.textContent = promotion.razon?.texto ?? '';
  razon.hidden = !razon.textContent;
  const insignias = card.querySelector('.promo-badges');
  insignias.textContent = (promotion.insignias ?? []).map(insignia => insignia.texto).join(' · ');
  insignias.hidden = !insignias.textContent;
  const vencida = card.querySelector('.promo-expired');
  vencida.textContent = 'Vencida';
  vencida.hidden = !promotion.vencida;
  const aplica = card.querySelector('.promo-applicability');
  aplica.textContent = 'Aplica a tu tarjeta ' + (promotion.applicableCard === 'black' ? 'Black' : 'Básica');
  aplica.dataset.tarjeta = promotion.applicableCard === 'black' ? 'black' : 'basica';
  const badge = card.querySelector('.promo-exclusive');
  badge.hidden = !promotion.exclusive;
  badge.textContent = promotion.exclusive ? 'Exclusiva Black' : '';
  if (promotion.expired || promotion.upcoming || promotion.vencida) link.classList.add('promo-card--inactive');
  mostrarImagen(card.querySelector('.promo-photo'), promotion.imageUrl, promotion.imageAlt);
  mostrarImagen(card.querySelector('.merchant-logo'), promotion.logoUrl);
  // La tira muestra los días fijos; las condiciones no los repiten.
  mostrarDias(card.querySelector('.promo-dias'), promotion);
  mostrarCondiciones(card.querySelector('.promo-conditions'), promotion, { dias: false });
  const boton = card.querySelector('.guardar-promo');
  const error = card.querySelector('.guardar-error');
  marcarGuardada(boton, idsGuardados.includes(promotion.id));
  boton.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    return alternarGuardada(boton, error, promotion.id, true);
  };
  return card;
}

const profile = await requireSession({ revelar:false });
if (profile) {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  const showAll = document.querySelector('#show-all');
  const exitToday = document.querySelector('#exit-today');
  const clearSearchEmpty = document.querySelector('#clear-search-empty');
  const emptyPreferences = document.querySelector('#empty-preferences');
  const searchBox = document.querySelector('#search-box');
  const searchInput = document.querySelector('#merchant-search');
  const clearSearch = document.querySelector('#clear-search');
  const todayFilter = document.querySelector('#today-filter');
  const filtros = document.querySelector('#category-filter');
  const chips = [...document.querySelectorAll('.filter-chip')];
  const cardChoice = document.querySelector('#card-choice');
  const cardOptions = document.querySelector('#card-options');
  const cardSingle = document.querySelector('#card-single');
  const sessionBadge = document.querySelector('#session-profile');
  const franja = document.querySelector('#franja');
  const conteo = document.querySelector('#pr-conteo');
  avisoGuardar = crearAviso(document.querySelector('#pr-aviso'));
  let carrusel = null;
  let preferencias = null;
  const sesion = almacenSesion();
  const pedida = leerCategoria(location.search, history.state, profile.id);
  const opcionesTarjeta = [];
  let categorias = null;
  let categoria = null;
  let hoy = leerHoy(location.search, history.state, profile.id);
  let busqueda = leerBusqueda(location.search, history.state, profile.id);
  let tarjeta = null;
  let preparada = false;
  let consultaActual = 0;
  let timerBusqueda = null;
  let aperturaRegistrada = false;
  let volverDelDetalle = location.hash.startsWith('#promo-');
  const indicador = document.querySelector('#promotions-loading');

  searchInput.value = busqueda ?? '';
  clearSearch.hidden = !searchInput.value;

  // H5, H17 y H10: los filtros activos quedan marcados y en la entrada del historial, para volver del detalle al mismo listado.
  function mostrarFiltro(url) {
    for (const chip of chips) chip.setAttribute('aria-pressed', String((chip.dataset.category || null) === categoria));
    todayFilter.setAttribute('aria-pressed', String(hoy));
    history.replaceState(estadoNavegacion(profile.id, categoria), '', url);
  }

  function textoVacio() {
    const nombre = categoria && categoriaVigente(categoria, categorias).nombre;
    if (busqueda) {
      if (hoy) return nombre ? `No hay promociones de ${nombre} disponibles hoy para "${busqueda}".` : `No hay promociones disponibles hoy para "${busqueda}".`;
      return nombre ? `No hay promociones de ${nombre} para "${busqueda}".` : `No hay promociones para "${busqueda}".`;
    }
    if (hoy) return nombre ? `No hay promociones de ${nombre} disponibles hoy para tu perfil.` : 'No hay promociones disponibles hoy para tu perfil.';
    return nombre ? `No hay promociones de ${nombre} para tu perfil.` : 'No hay promociones para tus intereses.';
  }

  function crearFiltro(item) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip';
    chip.dataset.category = item.id;
    chip.textContent = item.nombre;
    chip.addEventListener('click', () => elegir(item.id));
    filtros.append(chip);
    chips.push(chip);
  }

  // H16: la tarjeta activa se marca en el selector y en la cabecera.
  function mostrarTarjeta() {
    for (const opcion of opcionesTarjeta) opcion.setAttribute('aria-pressed', String(opcion.dataset.card === tarjeta.id));
    // Sistema visual: la cabecera toma el color de la tarjeta elegida.
    if (document.body) document.body.dataset.tarjeta = tarjeta.tipoTarjeta === 'black' ? 'black' : 'basica';
    cardSingle.textContent = 'Tus beneficios con ' + textoTarjeta(tarjeta);
    if (sessionBadge) sessionBadge.textContent = `${profile.nombre} · ${cardName(tarjeta)}`;
  }

  function crearOpcionTarjeta(item) {
    const opcion = document.createElement('button');
    opcion.type = 'button';
    opcion.className = 'card-option';
    opcion.dataset.card = item.id;
    opcion.dataset.tipo = item.tipoTarjeta;
    opcion.textContent = etiquetaTarjeta(item);
    opcion.addEventListener('click', () => cambiarTarjeta(item));
    cardOptions.append(opcion);
    opcionesTarjeta.push(opcion);
  }

  function mostrarSinTarjetas() {
    status.textContent = 'No tienes tarjetas para consultar beneficios.';
    status.className = 'note';
    filtros.hidden = true;
    todayFilter.hidden = true;
    searchBox.hidden = true;
  }

  async function leerIdsGuardados() {
    if (typeof fetch !== 'function') return [];
    const aviso = document.querySelector('#saved-status');
    try {
      const response = await fetch('/api/guardadas', { cache: 'no-store' });
      if (response.status === 401) { location.replace('/index.html'); return []; }
      if (!response.ok) throw new Error('No se pudieron cargar las promociones guardadas.');
      const datos = await response.json();
      if (aviso) aviso.textContent = '';
      return datos.ids || [];
    } catch (error) {
      if (aviso) aviso.textContent = error.message;
      return [];
    }
  }

  // Categorías vigentes (H5) y tarjetas propias (H16) se cargan juntas; si algo falla, Reintentar.
  async function prepararPagina() {
    status.textContent = '';
    status.className = 'note';
    retry.hidden = true;
    let tarjetas;
    try {
      if (!aperturaRegistrada) { await registrarAperturaPromociones(); aperturaRegistrada = true; }
      if (new URLSearchParams(location.search).get('entrada') === 'menu') {
        preferencias = await getJSON('/api/preferencias');
        const destino = destinoEntradaPromociones(location.search, preferencias);
        if (destino) { location.replace(destino); return false; }
      }
      revelarPagina();
      [categorias, tarjetas] = await Promise.all([getJSON('/api/categorias'), getJSON('/api/tarjetas')]);
    } catch (error) {
      revelarPagina();
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
      return false;
    }
    categorias.forEach(crearFiltro);
    categoria = categoriaVigente(pedida, categorias)?.id ?? null;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda) + location.hash);
    tarjeta = tarjetaActiva(tarjetas, leerTarjetaElegida(sesion, profile.id));
    preparada = true;
    if (!tarjeta) {
      mostrarSinTarjetas();
      return false;
    }
    guardarTarjetaElegida(sesion, profile.id, tarjeta.id);
    if (tarjetas.length > 1) {
      tarjetas.forEach(crearOpcionTarjeta);
      cardChoice.hidden = false;
    } else {
      cardSingle.hidden = false;
    }
    mostrarTarjeta();
    return true;
  }

  // Franja de avisos: se recalcula con cada lista; un aviso de promoción desplaza la lista hasta ella.
  function enlaceAviso(accion) {
    if (accion.tipo === 'ir') return accion.destino;
    return accion.tipo === 'detalle' ? urlDetalle(accion.id, categoria, hoy, busqueda) : null;
  }

  function irAPromocion(accion) {
    const elegida = document.getElementById('promo-' + accion.id)?.closest('.promo-item');
    if (!elegida) { location.assign(urlDetalle(accion.id, categoria, hoy, busqueda)); return; }
    elegida.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    elegida.classList.remove('pr-resaltada');
    requestAnimationFrame(() => elegida.classList.add('pr-resaltada'));
    elegida.querySelector('a').focus({ preventScroll: true });
  }

  function pintarFranja(promociones, estrategia) {
    carrusel?.parar();
    carrusel = null;
    const diapositivas = promociones.length ? diapositivasFranja({
      promociones, hoy: hoyEnElSalvador(), estrategia, guardadas: idsGuardados, encuestaPendiente: preferencias?.completed === false
    }) : [];
    franja.hidden = diapositivas.length === 0;
    if (diapositivas.length) carrusel = montarCarrusel(franja, diapositivas, { enlace: enlaceAviso, alPulsar: irAPromocion });
  }

  async function loadPromotions() {
    const turno = ++consultaActual;
    conteo.textContent = '';
    status.textContent = '';
    status.className = 'note';
    retry.hidden = true;
    clearSearchEmpty.hidden = true;
    showAll.hidden = true;
    exitToday.hidden = true;
    emptyPreferences.hidden = true;
    cards.replaceChildren();
    indicador.hidden = false;
    try {
      // La API valida la tarjeta y el motor ordena sus beneficios según tus intereses, con categoría, Disponibles hoy y búsqueda.
      const consulta = conTarjeta(urlConsulta(categoria, hoy, busqueda), tarjeta.id);
      // H22: al volver del detalle se conserva el orden de la visita; entrar o cambiar un filtro lo recalcula.
      const guardada = volverDelDetalle ? leerInstantanea(sesion, profile.id, consulta) : null;
      volverDelDetalle = false;
      const respuesta = guardada ?? await conMinimoCarga(() => getJSON(consulta));
      if (turno !== consultaActual) return; // Llegó tarde: ya se eligió otro filtro u otra tarjeta.
      if (!guardada) guardarInstantanea(sesion, profile.id, consulta, respuesta);
      const promotions = marcarVencidas(respuesta.promociones);
      idsGuardados = await leerIdsGuardados();
      if (turno !== consultaActual) return;
      for (const promotion of promotions) cards.append(crearOferta(promotion, categoria, hoy, busqueda));
      const vacio = promotions.length === 0;
      conteo.textContent = vacio ? '' : promotions.length === 1 ? '1 promoción' : `${promotions.length} promociones`;
      pintarFranja(promotions, respuesta.estrategia);
      const sinCatalogo = respuesta.vacio === 'sin-catalogo';
      status.textContent = !vacio ? '' : sinCatalogo ? 'No hay promociones para tu tarjeta.' : textoVacio();
      clearSearchEmpty.hidden = !vacio || sinCatalogo || !busqueda;
      showAll.hidden = !vacio || sinCatalogo || !categoria;
      exitToday.hidden = !vacio || sinCatalogo || !hoy;
      emptyPreferences.hidden = !vacio || sinCatalogo || hoy || Boolean(busqueda);
      const seleccionado = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (seleccionado?.classList.contains('promo-card')) seleccionado.scrollIntoView({ block: 'center' });
    } catch (error) {
      if (turno !== consultaActual) return;
      pintarFranja([]);
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
    } finally {
      if (turno === consultaActual) indicador.hidden = true;
    }
  }

  function elegir(nueva) {
    if (nueva === categoria) return;
    categoria = nueva;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda));
    return loadPromotions();
  }

  function cambiarHoy(activo) {
    if (!tarjeta || activo === hoy) return;
    hoy = activo;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda));
    return loadPromotions();
  }

  function buscarComercio(texto) {
    searchInput.value = texto;
    clearSearch.hidden = !texto;
    const nueva = normalizarBusqueda(texto);
    if (nueva === busqueda) return;
    busqueda = nueva;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda));
    if (!tarjeta) return;
    // Debounce: actualiza URL de inmediato pero espera 300 ms antes de consultar la API.
    if (timerBusqueda != null) clearTimeout(timerBusqueda);
    timerBusqueda = setTimeout(() => {
      timerBusqueda = null;
      loadPromotions();
    }, 300);
  }

  function cambiarTarjeta(nueva) {
    if (nueva.id === tarjeta.id) return;
    tarjeta = nueva;
    guardarTarjetaElegida(sesion, profile.id, tarjeta.id);
    mostrarTarjeta();
    return loadPromotions();
  }

  async function cargar() {
    if (!preparada && !await conIndicador(indicador, prepararPagina)) return;
    if (tarjeta) await loadPromotions();
  }

  const [todas] = chips;
  todas.addEventListener('click', () => elegir(null));
  showAll.addEventListener('click', () => elegir(null));
  todayFilter.addEventListener('click', () => cambiarHoy(!hoy));
  exitToday.addEventListener('click', () => cambiarHoy(false));
  searchInput.addEventListener('input', () => buscarComercio(searchInput.value));
  clearSearch.addEventListener('click', () => buscarComercio(''));
  clearSearchEmpty.addEventListener('click', () => buscarComercio(''));
  retry.addEventListener('click', cargar);
  await cargar();
}
