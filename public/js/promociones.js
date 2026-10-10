import { requireSession, getJSON } from './comun.js';
import { textoVigencia, mostrarImagen, mostrarCondiciones } from './promocion-vista.js';

async function loadPromotions() {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  status.textContent = 'Cargando promociones…';
  status.className = 'note';
  retry.hidden = true;
  cards.replaceChildren();
  document.querySelector('#empty-preferences').hidden = true;
  try {
    // La API aplica tarjeta y categorías del dueño de la sesión.
    const promotions = await getJSON('/api/promociones');
    for (const promotion of promotions) {
      const card = document.querySelector('#promotion-card').content.cloneNode(true);
      const link = card.querySelector('a');
      link.id = 'promo-' + promotion.id;
      link.href = '/detalle.html?id=' + encodeURIComponent(promotion.id);
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
      cards.append(card);
    }
    status.textContent = promotions.length ? '' : 'No hay promociones para tus intereses.';
    document.querySelector('#empty-preferences').hidden = promotions.length !== 0;
    const seleccionado = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (seleccionado?.classList.contains('promo-card')) seleccionado.scrollIntoView({ block: 'center' });
  } catch (error) {
    status.textContent = error.message;
    status.className = 'error';
    retry.hidden = false;
    document.querySelector('#empty-preferences').hidden = true;
  }
}

const profile = await requireSession();
if (profile) {
  document.querySelector('#retry').addEventListener('click', loadPromotions);
  loadPromotions();
}
