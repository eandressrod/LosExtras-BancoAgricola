import { readStorage, saveStorage, cardChoiceKey, cardShortName } from './comun.js';

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

/** Tipo y referencia enmascarada, por ejemplo "Black •••• 7754". */
export function etiquetaTarjeta(tarjeta) {
  return `${cardShortName(tarjeta)} ${tarjeta.numeroEnmascarado}`;
}

export function textoTarjeta(tarjeta) {
  return 'Tarjeta ' + etiquetaTarjeta(tarjeta);
}

export function conTarjeta(url, tarjetaId) {
  if (!tarjetaId) return url;
  return url + (url.includes('?') ? '&' : '?') + 'tarjeta=' + encodeURIComponent(tarjetaId);
}
