import { readStorage, saveStorage } from './comun.js';

// Secciones de Promociones (pestañas al estilo de «Para ti» y «Siguiendo»). La elegida dura la sesión del perfil
// en esta pestaña del navegador, para volver del detalle a la misma sección.

export const SECCIONES = Object.freeze(['para-ti', 'cerca', 'explorar']);

const clave = perfilId => 'extras.seccion.' + perfilId;
const conocida = seccion => (SECCIONES.includes(seccion) ? seccion : 'para-ti');

/** Sección a la izquierda (paso -1) o a la derecha (paso 1); en los extremos se queda donde está. */
export function seccionVecina(actual, paso) {
  const indice = SECCIONES.indexOf(conocida(actual)) + paso;
  return SECCIONES[Math.min(Math.max(indice, 0), SECCIONES.length - 1)];
}

/** Un gesto cuenta si recorre al menos 56 px en horizontal y es más horizontal que vertical. -1, 0 o 1. */
export function seccionPorDeslizamiento(dx, dy) {
  if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.5) return 0;
  return dx < 0 ? 1 : -1;
}

export function leerSeccion(storage, perfilId) {
  return conocida(storage ? readStorage(storage, clave(perfilId)) : null);
}

export function guardarSeccion(storage, perfilId, seccion) {
  return storage ? saveStorage(storage, clave(perfilId), conocida(seccion)) : false;
}

/** Explorar usa el mismo endpoint sin personalizar: quita la intención del día y añade explorar=1. */
export function urlSeccion(url, seccion) {
  if (seccion !== 'explorar') return url;
  const [ruta, busqueda = ''] = url.split('?');
  const parametros = new URLSearchParams(busqueda);
  parametros.delete('intencion');
  parametros.set('explorar', '1');
  return ruta + '?' + parametros.toString();
}
