import { requireSession } from './comun.js';
import { textoVigencia, mostrarImagen, mostrarCondiciones } from './promocion-vista.js';
import { consultarGuardadas, marcarBoton, alPulsarGuardar } from './guardar-promo.js';

function pintarVacio(datos) {
  const ninguna = document.querySelector('#empty-none');
  const filtro = document.querySelector('#empty-filter');
  const accion = document.querySelector('#empty-action');
  const hayVisibles = datos.promociones.length > 0;
  ninguna.hidden = hayVisibles || datos.sinCoincidencias;
  filtro.hidden = !datos.sinCoincidencias;
  accion.hidden = hayVisibles;
}

function tarjeta(promotion) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  const link = card.querySelector('a');
  link.href = '/detalle.html?id=' + encodeURIComponent(promotion.id) + '&desde=guardadas';
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
  mostrarImagen(card.querySelector('.promo-photo'), promotion.imageUrl, promotion.imageAlt);
  mostrarImagen(card.querySelector('.merchant-logo'), promotion.logoUrl);
  mostrarCondiciones(card.querySelector('.promo-conditions'), promotion);
  const boton = card.querySelector('.guardar-promo');
  marcarBoton(boton, true);
  alPulsarGuardar(boton, promotion.id, guardada => {
    if (!guardada) loadSaved();
  });
  return card;
}

async function loadSaved() {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  status.textContent = 'Cargando guardadas…';
  status.className = 'note';
  retry.hidden = true;
  cards.replaceChildren();
  document.querySelector('#empty-none').hidden = true;
  document.querySelector('#empty-filter').hidden = true;
  document.querySelector('#empty-action').hidden = true;
  try {
    const datos = await consultarGuardadas();
    if (!datos) return;
    for (const promotion of datos.promociones) cards.append(tarjeta(promotion));
    status.textContent = '';
    pintarVacio(datos);
  } catch (error) {
    status.textContent = error.message;
    status.className = 'error';
    retry.hidden = false;
  }
}

if (await requireSession()) {
  document.querySelector('#retry').addEventListener('click', loadSaved);
  loadSaved();
}
