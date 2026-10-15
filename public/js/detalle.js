import { requireSession, getJSON, almacenSesion, cardName } from './comun.js';
import { textoVigencia, textoDisponibleHoy, mostrarImagen, mostrarCondiciones } from './promocion-vista.js';
import { leerCategoria, leerHoy, estadoNavegacion, urlListado, urlDetalle } from './filtro-categoria.js';
import { leerTarjetaElegida, conTarjeta } from './tarjeta-elegida.js';

const profile = await requireSession();
if (profile) {
  const id = new URLSearchParams(location.search).get('id');
  // H5 y H17: volver al listado conserva los filtros si esta entrada pertenece al mismo perfil.
  const categoria = leerCategoria(location.search, history.state, profile.id);
  const hoy = leerHoy(location.search, history.state, profile.id);
  const back = document.querySelector('#back-to-list');
  history.replaceState(estadoNavegacion(profile.id, categoria), '', id ? urlDetalle(id, categoria, hoy) : location.href);
  back.href = urlListado(categoria, null, hoy);
  // H16: el detalle muestra el beneficio de la tarjeta elegida en "Para ti" (el backend valida que sea propia).
  const tarjetaId = leerTarjetaElegida(almacenSesion(), profile.id);

  async function loadDetail() {
    const status = document.querySelector('#detail-status');
    const retry = document.querySelector('#retry');
    const detail = document.querySelector('#detail');
    detail.hidden = true;
    retry.hidden = true;
    status.className = 'note';
    if (!id) { status.textContent = 'Selecciona una promoción desde el listado.'; return; }
    status.textContent = 'Cargando detalle…';
    try {
      const promotion = await getJSON(conTarjeta('/api/promocion?id=' + encodeURIComponent(id), tarjetaId));
      document.querySelector('h1').textContent = promotion.merchant;
      document.title = promotion.merchant + ' · Promoción';
      document.querySelector('#benefit').textContent = promotion.benefit;
      document.querySelector('#description').textContent = promotion.detailDescription || promotion.description;
      document.querySelector('#payment').textContent = 'Aplica a tu tarjeta ' + (promotion.applicableCard === 'black' ? 'Black' : 'Básica');
      document.querySelector('#validity').textContent = textoVigencia(promotion);
      const disponible = document.querySelector('#today');
      disponible.textContent = textoDisponibleHoy(promotion);
      disponible.hidden = !disponible.textContent;
      document.querySelector('#exclusive').hidden = !promotion.exclusive;
      mostrarImagen(document.querySelector('#promotion-image'), promotion.imageUrl, promotion.imageAlt);
      mostrarImagen(document.querySelector('#merchant-logo'), promotion.logoUrl);
      mostrarCondiciones(document.querySelector('#conditions'), promotion);
      back.href = urlListado(categoria, promotion.id, hoy);
      const sessionBadge = document.querySelector('#session-profile');
      if (sessionBadge) sessionBadge.textContent = `${profile.nombre} · ${cardName({ tipoTarjeta: promotion.applicableCard })}`;
      detail.hidden = false;
      status.textContent = '';
    } catch (error) {
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
    }
  }

  document.querySelector('#retry').addEventListener('click', loadDetail);
  await loadDetail();
}
