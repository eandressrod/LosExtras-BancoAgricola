import { requireSession, getJSON, almacenSesion, cardName } from './comun.js';
import { textoVigencia, mostrarImagen, mostrarCondiciones } from './promocion-vista.js';
import { leerCategoria, categoriaVigente, estadoNavegacion, urlConsulta, urlListado, urlDetalle } from './filtro-categoria.js';
import { leerTarjetaElegida, guardarTarjetaElegida, tarjetaActiva, etiquetaTarjeta, textoTarjeta, conTarjeta } from './tarjeta-elegida.js';

function crearOferta(promotion, categoria) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  const link = card.querySelector('a');
  link.id = 'promo-' + promotion.id;
  link.href = urlDetalle(promotion.id, categoria);
  link.setAttribute('aria-label', `${promotion.merchant}: ${promotion.benefit}. Ver promoción`);
  card.querySelector('h2').textContent = promotion.merchant;
  card.querySelector('.promo-benefit').textContent = promotion.benefit;
  card.querySelector('.promo-description').textContent = promotion.description;
  card.querySelector('.promo-category').textContent = promotion.categoryName || promotion.category;
  card.querySelector('.promo-validity').textContent = textoVigencia(promotion);
  card.querySelector('.promo-applicability').textContent = 'Aplica a tu tarjeta ' + (promotion.applicableCard === 'black' ? 'Black' : 'Básica');
  const badge = card.querySelector('.promo-exclusive');
  badge.hidden = !promotion.exclusive;
  badge.textContent = promotion.exclusive ? 'Exclusiva Black' : '';
  if (promotion.expired || promotion.upcoming) link.classList.add('promo-card--inactive');
  mostrarImagen(card.querySelector('.promo-photo'), promotion.imageUrl, promotion.imageAlt);
  mostrarImagen(card.querySelector('.merchant-logo'), promotion.logoUrl);
  mostrarCondiciones(card.querySelector('.promo-conditions'), promotion);
  return card;
}

const profile = await requireSession();
if (profile) {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  const showAll = document.querySelector('#show-all');
  const emptyPreferences = document.querySelector('#empty-preferences');
  const filtros = document.querySelector('#category-filter');
  const chips = [...document.querySelectorAll('.filter-chip')];
  const cardChoice = document.querySelector('#card-choice');
  const cardOptions = document.querySelector('#card-options');
  const cardSingle = document.querySelector('#card-single');
  const sessionBadge = document.querySelector('#session-profile');
  const sesion = almacenSesion();
  const pedida = leerCategoria(location.search, history.state, profile.id);
  const opcionesTarjeta = [];
  let categorias = null;
  let categoria = null;
  let tarjeta = null;
  let preparada = false;
  let consultaActual = 0;

  // H5: el filtro activo queda marcado y en la entrada del historial, para volver del detalle al mismo listado.
  function mostrarFiltro(url) {
    for (const chip of chips) chip.setAttribute('aria-pressed', String((chip.dataset.category || null) === categoria));
    history.replaceState(estadoNavegacion(profile.id, categoria), '', url);
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
    cardSingle.textContent = 'Tus beneficios con ' + textoTarjeta(tarjeta);
    if (sessionBadge) sessionBadge.textContent = `${profile.nombre} · ${cardName(tarjeta)}`;
  }

  function crearOpcionTarjeta(item) {
    const opcion = document.createElement('button');
    opcion.type = 'button';
    opcion.className = 'card-option';
    opcion.dataset.card = item.id;
    opcion.textContent = etiquetaTarjeta(item);
    opcion.addEventListener('click', () => cambiarTarjeta(item));
    cardOptions.append(opcion);
    opcionesTarjeta.push(opcion);
  }

  function mostrarSinTarjetas() {
    status.textContent = 'No tienes tarjetas para consultar beneficios.';
    status.className = 'note';
    filtros.hidden = true;
  }

  // Categorías vigentes (H5) y tarjetas propias (H16) se cargan juntas; si algo falla, Reintentar.
  async function prepararPagina() {
    status.textContent = 'Cargando promociones…';
    status.className = 'note';
    retry.hidden = true;
    let tarjetas;
    try {
      [categorias, tarjetas] = await Promise.all([getJSON('/api/categorias'), getJSON('/api/tarjetas')]);
    } catch (error) {
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
      return false;
    }
    categorias.forEach(crearFiltro);
    categoria = categoriaVigente(pedida, categorias)?.id ?? null;
    mostrarFiltro(urlListado(categoria) + location.hash);
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

  async function loadPromotions() {
    const turno = ++consultaActual;
    status.textContent = 'Cargando promociones…';
    status.className = 'note';
    retry.hidden = true;
    showAll.hidden = true;
    emptyPreferences.hidden = true;
    cards.replaceChildren();
    try {
      // La API valida la tarjeta y aplica sus beneficios, los intereses y la categoría del dueño de la sesión.
      const promotions = await getJSON(conTarjeta(urlConsulta(categoria), tarjeta.id));
      if (turno !== consultaActual) return; // Llegó tarde: ya se eligió otro filtro u otra tarjeta.
      for (const promotion of promotions) cards.append(crearOferta(promotion, categoria));
      if (promotions.length) status.textContent = '';
      else status.textContent = categoria ? `No hay promociones de ${categoriaVigente(categoria, categorias).nombre} para tu perfil.` : 'No hay promociones para tus intereses.';
      showAll.hidden = promotions.length !== 0 || !categoria;
      emptyPreferences.hidden = promotions.length !== 0;
      const seleccionado = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (seleccionado?.classList.contains('promo-card')) seleccionado.scrollIntoView({ block: 'center' });
    } catch (error) {
      if (turno !== consultaActual) return;
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
    }
  }

  function elegir(nueva) {
    if (nueva === categoria) return;
    categoria = nueva;
    mostrarFiltro(urlListado(categoria));
    return loadPromotions();
  }

  function cambiarTarjeta(nueva) {
    if (nueva.id === tarjeta.id) return;
    tarjeta = nueva;
    guardarTarjetaElegida(sesion, profile.id, tarjeta.id);
    mostrarTarjeta();
    return loadPromotions();
  }

  async function cargar() {
    if (!preparada && !await prepararPagina()) return;
    if (tarjeta) await loadPromotions();
  }

  const [todas] = chips;
  todas.addEventListener('click', () => elegir(null));
  showAll.addEventListener('click', () => elegir(null));
  retry.addEventListener('click', cargar);
  await cargar();
}
