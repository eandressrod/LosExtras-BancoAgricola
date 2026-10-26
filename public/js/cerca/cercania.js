// H8: cercanía calculada en el navegador. La distancia es aproximada y en línea recta (haversine).

export const RADIO_METROS = 3000;
const SIN_PENALIZACION_METROS = 500;
const FACTOR_MINIMO = 0.2;
const R_MAXIMO = 95;
const MAXIMO_ALTERNATIVAS = 5;
const RADIO_TIERRA_METROS = 6371000;

const radianes = grados => grados * Math.PI / 180;

/** Distancia en metros entre dos puntos {latitud, longitud}. */
export function distanciaMetros(a, b) {
  const dLat = radianes(b.latitud - a.latitud);
  const dLon = radianes(b.longitud - a.longitud);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radianes(a.latitud)) * Math.cos(radianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(h));
}

/** D: 1 hasta 500 m y baja de forma lineal hasta 0.2 a 3 km. */
export function factorDistancia(metros) {
  if (metros <= SIN_PENALIZACION_METROS) return 1;
  const avance = Math.min(1, (metros - SIN_PENALIZACION_METROS) / (RADIO_METROS - SIN_PENALIZACION_METROS));
  return 1 - avance * (1 - FACTOR_MINIMO);
}

/** Orden de Cerca de ti: D × (0.2 + 0.8 × R / 95). Sin puntaje del motor, R = 0. */
export function puntajeCercania(metros, R) {
  const r = Math.min(R_MAXIMO, Math.max(0, Number(R) || 0));
  return factorDistancia(metros) * (FACTOR_MINIMO + (1 - FACTOR_MINIMO) * r / R_MAXIMO);
}

const coordenadas = sucursal => ({ latitud: sucursal.latitude, longitud: sucursal.longitude });

/** Sucursal participante más cercana al origen, o null si la promoción no tiene sucursales presenciales. */
export function sucursalMasCercana(promocion, origen) {
  let mejor = null;
  for (const sucursal of promocion.branches ?? []) {
    const metros = distanciaMetros(origen, coordenadas(sucursal));
    if (!mejor || metros < mejor.metros) mejor = { sucursal, metros };
  }
  return mejor;
}

/**
 * Ofertas dentro del radio, una vez cada una con su sucursal más cercana, ordenadas por puntaje.
 * Si ninguna cae dentro, devuelve las más cercanas con fueraDelRadio para etiquetarlas.
 */
export function resultadosCerca(promociones, origen) {
  const candidatas = promociones
    .map(promocion => ({ promocion, cercana: sucursalMasCercana(promocion, origen) }))
    .filter(({ cercana }) => cercana)
    .map(({ promocion, cercana }) => ({ promocion, ...cercana, puntaje: puntajeCercania(cercana.metros, promocion.componentes?.R) }));
  const dentro = candidatas.filter(r => r.metros <= RADIO_METROS);
  if (dentro.length) return { resultados: dentro.sort((a, b) => b.puntaje - a.puntaje || a.metros - b.metros), fueraDelRadio: false };
  const cercanas = candidatas.sort((a, b) => a.metros - b.metros).slice(0, MAXIMO_ALTERNATIVAS);
  return { resultados: cercanas, fueraDelRadio: cercanas.length > 0 };
}

/** «A X km aprox.», con un decimal y al menos 0.1 km. */
export function textoDistancia(metros) {
  return `A ${Math.max(0.1, Math.round(metros / 100) / 10).toFixed(1)} km aprox.`;
}
