import { readStorage, saveStorage, cardChoiceKey, cardShortName, cardName, almacenSesion, getJSON } from './comun.js';

// H16: elegir una de mis tarjetas para consultar sus beneficios. La elección dura la sesión del perfil
// en esta pestaña; el backend comprueba en cada consulta que la tarjeta sea del usuario.

export function leerTarjetaElegida(storage, perfilId) {
  return readStorage(storage, cardChoiceKey(perfilId));
}

export function guardarTarjetaElegida(storage, perfilId, tarjetaId) {
  return saveStorage(storage, cardChoiceKey(perfilId), tarjetaId);
}

/** La elegida si sigue siendo propia; si no, la predeterminada del perfil (o la primera). */
export function tarjetaActiva(tarjetas, elegida) {
  return tarjetas.find(tarjeta => tarjeta.id === elegida) ?? tarjetas.find(tarjeta => tarjeta.predeterminada) ?? tarjetas[0] ?? null;
}

/** Tipo y referencia enmascarada, por ejemplo "Black •••• 7754". La tarjeta del perfil no trae referencia. */
export function etiquetaTarjeta(tarjeta) {
  return [cardShortName(tarjeta), tarjeta.numeroEnmascarado].filter(Boolean).join(' ');
}

export function textoTarjeta(tarjeta) {
  return 'Tarjeta ' + etiquetaTarjeta(tarjeta);
}

// SCRUM-109: la sesión se describe con las tarjetas propias, nunca con el tipo heredado del perfil.
/** La elegida si sigue siendo propia, la única si hay una, «N tarjetas» si hay varias y null sin tarjetas. */
export function descripcionTarjetas(tarjetas, elegida) {
  if (!tarjetas?.length) return null;
  const tarjeta = tarjetas.find(item => item.id === elegida) ?? (tarjetas.length === 1 ? tarjetas[0] : null);
  return tarjeta ? cardName(tarjeta) : `${tarjetas.length} tarjetas`;
}

export function textoInsignia(perfil, tarjetas, elegida) {
  return [perfil.nombre, descripcionTarjetas(tarjetas, elegida)].filter(Boolean).join(' · ');
}

/** Completa la insignia #session-profile con las tarjetas propias; si no cargan, queda solo el nombre. */
export async function mostrarTarjetasSesion(perfil, storage = almacenSesion()) {
  const insignia = document.querySelector('#session-profile');
  if (!insignia) return;
  try {
    insignia.textContent = textoInsignia(perfil, await getJSON('/api/tarjetas'), leerTarjetaElegida(storage, perfil.id));
  } catch { /* Sin tarjetas verificadas no se muestra un tipo. */ }
}

export function conTarjeta(url, tarjetaId) {
  if (!tarjetaId) return url;
  return url + (url.includes('?') ? '&' : '?') + 'tarjeta=' + encodeURIComponent(tarjetaId);
}
