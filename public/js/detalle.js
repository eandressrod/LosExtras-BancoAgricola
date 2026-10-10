import { requireSession, getJSON } from './comun.js';
import { textoVigencia, mostrarImagen, mostrarCondiciones } from './promocion-vista.js';

async function loadDetail() {
  const id = new URLSearchParams(location.search).get('id');
  const status = document.querySelector('#detail-status');
  const retry = document.querySelector('#retry');
  const detail = document.querySelector('#detail');
  detail.hidden = true;
  retry.hidden = true;
  status.className = 'note';
  if (!id) { status.textContent = 'Selecciona una promoción desde el listado.'; return; }
  status.textContent = 'Cargando detalle…';
  try {
    const promotion = await getJSON('/api/promocion?id=' + encodeURIComponent(id));
    document.querySelector('h1').textContent = promotion.merchant;
    document.title = promotion.merchant + ' · Promoción';
    document.querySelector('#benefit').textContent = promotion.benefit;
    document.querySelector('#description').textContent = promotion.detailDescription || promotion.description;
    document.querySelector('#payment').textContent = 'Aplica a tu tarjeta ' + (promotion.applicableCard === 'black' ? 'Black' : 'Básica');
    document.querySelector('#validity').textContent = textoVigencia(promotion);
    document.querySelector('#exclusive').hidden = !promotion.exclusive;
    mostrarImagen(document.querySelector('#promotion-image'), promotion.imageUrl, promotion.imageAlt);
    mostrarImagen(document.querySelector('#merchant-logo'), promotion.logoUrl);
    mostrarCondiciones(document.querySelector('#conditions'), promotion);
    document.querySelector('#back-to-list').href = '/promociones.html#promo-' + encodeURIComponent(promotion.id);
    document.querySelector('#detail').hidden = false;
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message;
    status.className = 'error';
    retry.hidden = false;
  }
}

if (await requireSession()) {
  document.querySelector('#retry').addEventListener('click', loadDetail);
  loadDetail();
}
