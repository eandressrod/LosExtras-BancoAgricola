import { requireSession, getJSON } from './comun.js';
import { textoVigencia, mostrarImagen, mostrarCondiciones } from './promocion-vista.js';
import { leerCategoria, estadoNavegacion, urlConsulta, urlListado, urlDetalle } from './filtro-categoria.js';

function crearTarjeta(promotion, categoria) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  const link = card.querySelector('a');
  link.id = 'promo-' + promotion.id;
  link.href = urlDetalle(promotion.id, categoria);
  link.setAttribute('aria-label', `${promotion.merchant}: ${promotion.benefit}. Ver promoción`);
  card.querySelector('h2').textContent = promotion.merchant;
  card.querySelector('.promo-benefit').textContent = promotion.benefit;
  card.querySelector('.promo-description').textContent = promotion.description;
  card.querySelector('.promo-category').textContent = promotion.category;
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
  const chips = [...document.querySelectorAll('.filter-chip')];
  let categoria = leerCategoria(location.search, history.state, profile.id);
  let consultaActual = 0;

  // El filtro activo queda marcado y en la entrada del historial, para volver del detalle al mismo listado.
  function mostrarFiltro(url) {
    for (const chip of chips) chip.setAttribute('aria-pressed', String((chip.dataset.category || null) === categoria));
    history.replaceState(estadoNavegacion(profile.id, categoria), '', url);
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
      // La API aplica tarjeta, intereses y la categoría elegida del dueño de la sesión.
      const promotions = await getJSON(urlConsulta(categoria));
      if (turno !== consultaActual) return; // Llegó tarde: ya se eligió otro filtro.
      for (const promotion of promotions) cards.append(crearTarjeta(promotion, categoria));
      if (promotions.length) status.textContent = '';
      else status.textContent = categoria ? `No hay promociones de ${categoria} para tu perfil.` : 'No hay promociones para tus intereses.';
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

  chips.forEach(chip => chip.addEventListener('click', () => elegir(chip.dataset.category || null)));
  showAll.addEventListener('click', () => elegir(null));
  retry.addEventListener('click', loadPromotions);
  mostrarFiltro(urlListado(categoria) + location.hash);
  await loadPromotions();
}
