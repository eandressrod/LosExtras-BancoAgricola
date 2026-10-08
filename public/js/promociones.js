import { requireSession, loadPreferences, getJSON } from './comun.js';

async function loadPromotions() {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  status.textContent = 'Cargando promociones…';
  status.className = 'note';
  retry.hidden = true;
  cards.replaceChildren();
  try {
    const preferences = loadPreferences();
    const promotions = await getJSON('/api/promociones');
    const visible = preferences.completed ? promotions.filter(item => preferences.categories.includes(item.category)) : promotions;
    document.querySelector('#list-description').textContent = preferences.completed ? 'Promociones según tus intereses.' : 'Promociones disponibles.';
    for (const promotion of visible) {
      const card = document.querySelector('#promotion-card').content.cloneNode(true);
      card.querySelector('h2').textContent = promotion.merchant;
      card.querySelector('strong').textContent = promotion.benefit;
      card.querySelector('.description').textContent = promotion.description;
      const link = card.querySelector('a');
      link.href = '/detalle.html?id=' + encodeURIComponent(promotion.id);
      link.setAttribute('aria-label', 'Ver promoción de ' + promotion.merchant);
      cards.append(card);
    }
    status.textContent = visible.length ? '' : 'No hay promociones para tus intereses.';
  } catch (error) {
    status.textContent = error.message;
    status.className = 'error';
    retry.hidden = false;
  }
}

if (requireSession()) {
  document.querySelector('#retry').addEventListener('click', loadPromotions);
  loadPromotions();
}
