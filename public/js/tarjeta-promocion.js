// SCRUM-129: una sola forma de llenar la tarjeta de promoción del listado y de Guardadas.
import { textoVigencia, textoVencePronto, hoyEnElSalvador, textoOtrasTarjetas, textoAplica, mostrarImagen, mostrarCondiciones, mostrarDias } from './promocion-vista.js';

/**
 * Llena la plantilla #promotion-card y devuelve su enlace. Los elementos que una plantilla no trae
 * (Guardadas no muestra razón, insignias, vencida ni otras tarjetas) se omiten.
 * `totalTarjetas` es cuántas tiene el perfil: con más de una, el pie dice con cuáles aplica.
 */
export function llenarTarjetaPromocion(card, promotion, { href, totalTarjetas = 1 } = {}) {
  const link = card.querySelector('a');
  link.href = href;
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
  const opcional = (selector, llenar) => { const nodo = card.querySelector(selector); if (nodo) llenar(nodo); };
  opcional('.promo-ending', vence => {
    vence.textContent = textoVencePronto(promotion, hoyEnElSalvador());
    vence.hidden = !vence.textContent;
  });
  // H22: una sola razón del motor; los criterios declarados solo como insignias.
  opcional('.promo-reason', razon => {
    razon.textContent = promotion.razon?.texto ?? '';
    razon.hidden = !razon.textContent;
  });
  opcional('.promo-badges', insignias => {
    insignias.textContent = (promotion.insignias ?? []).map(insignia => insignia.texto).join(' · ');
    insignias.hidden = !insignias.textContent;
  });
  opcional('.promo-expired', vencida => {
    vencida.textContent = 'Vencida';
    vencida.hidden = !promotion.vencida;
  });
  const aplica = card.querySelector('.promo-applicability');
  const { texto: textoTarjetas, tarjeta } = textoAplica(promotion, totalTarjetas);
  aplica.textContent = textoTarjetas;
  aplica.dataset.tarjeta = tarjeta;
  // Todas las tarjetas (SCRUM-133): la otra tarjeta propia solo se menciona si su beneficio cambia.
  opcional('.promo-otras', otras => {
    otras.textContent = textoOtrasTarjetas(promotion);
    otras.hidden = !otras.textContent;
  });
  const badge = card.querySelector('.promo-exclusive');
  badge.hidden = !promotion.exclusive;
  badge.textContent = promotion.exclusive ? 'Exclusiva Black' : '';
  mostrarImagen(card.querySelector('.promo-photo'), promotion.imageUrl, promotion.imageAlt);
  mostrarImagen(card.querySelector('.merchant-logo'), promotion.logoUrl);
  // H17 y sistema visual: el reloj dice si aplica hoy o qué días; las condiciones no repiten los días.
  mostrarDias(card.querySelector('.promo-cuando'), promotion);
  mostrarCondiciones(card.querySelector('.promo-conditions'), promotion, { dias: false });
  return link;
}
