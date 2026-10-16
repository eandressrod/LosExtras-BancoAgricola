import { requireSession, getJSON, almacenSesion, cardName } from './comun.js';
import { textoVigencia, textoDisponibleHoy, mostrarImagen, mostrarCondiciones } from './promocion-vista.js';
import { leerCategoria, leerHoy, leerBusqueda, estadoNavegacion, urlListado, urlDetalle } from './filtro-categoria.js';
import { leerTarjetaElegida, conTarjeta } from './tarjeta-elegida.js';
import { conMinimoCarga } from './carga-tiempo.js';

const profile = await requireSession();
if (profile) {
  const parametros = new URLSearchParams(location.search);
  const id = parametros.get('id');
  // Se lee antes de normalizar la URL: replaceState no debe borrar el origen.
  const desdeGuardadas = parametros.get('desde') === 'guardadas';
  // H5, H17 y H10: volver al listado conserva los filtros y la búsqueda si esta entrada pertenece al mismo perfil.
  const categoria = leerCategoria(location.search, history.state, profile.id);
  const hoy = leerHoy(location.search, history.state, profile.id);
  const busqueda = leerBusqueda(location.search, history.state, profile.id);
  const back = document.querySelector('#back-to-list');
  const retornoGuardadas = '/guardadas.html' + (busqueda ? '?comercio=' + encodeURIComponent(busqueda) : '');
  const destino = id ? urlDetalle(id, categoria, hoy, busqueda) + (desdeGuardadas ? '&desde=guardadas' : '') : location.href;
  history.replaceState(estadoNavegacion(profile.id, categoria), '', destino);
  if (desdeGuardadas) {
    back.href = retornoGuardadas;
    back.textContent = 'Volver a guardadas';
  } else {
    back.href = urlListado(categoria, null, hoy, busqueda);
  }
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
      const promotion = await conMinimoCarga(() => getJSON(conTarjeta('/api/promocion?id=' + encodeURIComponent(id), tarjetaId)));
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
      if (desdeGuardadas) {
        back.href = retornoGuardadas;
        back.textContent = 'Volver a guardadas';
      } else {
        back.href = urlListado(categoria, promotion.id, hoy, busqueda);
        back.textContent = 'Volver al listado';
      }
      const sessionBadge = document.querySelector('#session-profile');
      if (sessionBadge) sessionBadge.textContent = `${profile.nombre} · ${cardName({ tipoTarjeta: promotion.applicableCard })}`;
      const boton = document.querySelector('#guardar-promo');
      if (boton && typeof fetch === 'function') {
        boton.hidden = false;
        let guardada = false;
        try {
          const lista = await fetch('/api/guardadas', { cache: 'no-store' });
          if (lista.ok) guardada = ((await lista.json()).ids || []).includes(id);
        } catch { /* el detalle sigue visible aunque no se lean las guardadas */ }
        boton.dataset.guardada = guardada ? 'si' : 'no';
        boton.textContent = guardada ? 'Quitar' : 'Guardar';
        boton.onclick = async event => {
          event.preventDefault();
          const aviso = document.querySelector('#guardar-error');
          if (aviso) aviso.textContent = '';
          const quitar = boton.dataset.guardada === 'si';
          try {
            const response = await fetch('/api/guardadas', {
              method: quitar ? 'DELETE' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ promocionId: id })
            });
            if (response.status === 401) { location.replace('/index.html'); return; }
            if (!response.ok) throw new Error('No se pudo actualizar. Intenta de nuevo.');
            boton.dataset.guardada = quitar ? 'no' : 'si';
            boton.textContent = quitar ? 'Guardar' : 'Quitar';
          } catch (error) {
            if (aviso) aviso.textContent = error.message;
          }
        };
      }
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