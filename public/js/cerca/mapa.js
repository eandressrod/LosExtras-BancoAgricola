// H8: mapa con MapLibre GL JS y teselas de OpenFreeMap (ADR-012). El motor se carga solo en las pantallas que lo usan.
// Las teselas son de otro origen: el service worker no las intercepta ni las guarda.

const BASE = '/vendor/maplibre-gl@6.16.0/';
const ESTILO = 'https://tiles.openfreemap.org/styles/liberty';
const ESPERA_MAXIMA_MS = 15000;
export const COLOR_RECORRIDO = '#1f5fd6';
/** Separación del globo sobre el punto del pin (40 px de alto). */
export const SEPARACION_GLOBO = 44;
// Textos propios de MapLibre que lee un lector de pantalla.
const TEXTOS = {
  'AttributionControl.MapFeedback': 'Comentarios sobre el mapa',
  'AttributionControl.ToggleAttribution': 'Mostrar u ocultar créditos del mapa',
  'Map.Title': 'Mapa',
  'Marker.Title': 'Marcador',
  'Popup.Close': 'Cerrar'
};
let motor = null;
let intentos = 0;

/** El navegador recuerda una importación fallida: cada reintento pide el motor con otra URL. */
export function urlMotor(intento) {
  return BASE + 'maplibre-gl.mjs' + (intento ? `?intento=${intento}` : '');
}

function cargarMotor() {
  if (!document.querySelector('link[data-maplibre]')) {
    const hoja = document.createElement('link');
    hoja.rel = 'stylesheet';
    hoja.href = BASE + 'maplibre-gl.css';
    hoja.dataset.maplibre = '';
    document.head.append(hoja);
  }
  motor ??= import(urlMotor(intentos)).catch(error => { motor = null; intentos += 1; throw error; });
  return motor;
}

/**
 * Dónde dejar la sucursal elegida para que su globo se vea completo: el pin baja hasta quedar sobre la atribución y
 * el globo, encima, recibe el alto que queda (con desplazamiento interno si no alcanza).
 */
export function colocacionGlobo(altoMapa) {
  const MARGEN_INFERIOR = 56; // Atribución y aire bajo el pin.
  const MARGEN_SUPERIOR = 12;
  const PUNTA = 10;
  const RELLENO = 24; // .maplibregl-popup-content: 12 px arriba y abajo.
  const y = Math.max(0, Math.floor(altoMapa / 2 - MARGEN_INFERIOR));
  const pin = altoMapa / 2 + y;
  return {
    desplazamiento: [0, y],
    altoMaximo: Math.max(120, Math.floor(pin - SEPARACION_GLOBO - PUNTA - RELLENO - MARGEN_SUPERIOR))
  };
}

/** Crea el mapa y espera a que cargue el estilo. Rechaza si el motor o las teselas no responden. */
export async function crearMapa(contenedor, { centro, zoom = 13, interactivo = true }) {
  const ml = await cargarMotor();
  const mapa = new ml.Map({
    container: contenedor, style: ESTILO, center: [centro.longitud, centro.latitud], zoom,
    interactive: interactivo, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false, locale: TEXTOS
  });
  mapa.touchZoomRotate?.disableRotation();
  await new Promise((resolver, rechazar) => {
    const espera = setTimeout(() => rechazar(new Error('El mapa no respondió.')), ESPERA_MAXIMA_MS);
    mapa.once('load', () => { clearTimeout(espera); resolver(); });
    mapa.once('error', evento => { clearTimeout(espera); rechazar(evento.error ?? new Error('El mapa no cargó.')); });
  }).catch(error => { mapa.remove(); throw error; });
  return { ml, mapa };
}

/** Marcador accesible: un botón con su nombre, o un punto decorativo si no recibe acción. */
export function crearMarcador(ml, { posicion, clase, etiqueta, alTocar }) {
  const elemento = document.createElement(alTocar ? 'button' : 'span');
  elemento.className = 'pr-marcador ' + clase;
  if (alTocar) {
    elemento.type = 'button';
    elemento.setAttribute('aria-label', etiqueta);
    elemento.addEventListener('click', evento => { evento.stopPropagation(); alTocar(); });
  } else {
    elemento.setAttribute('aria-hidden', 'true');
  }
  return new ml.Marker({ element: elemento, anchor: clase.includes('origen') ? 'center' : 'bottom' })
    .setLngLat([posicion.longitud, posicion.latitud]);
}

/** Dibuja o reemplaza la línea de recorrido aproximada (punteada) con coordenadas GeoJSON. */
export function dibujarRecorrido(mapa, coordenadas) {
  const datos = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coordenadas } };
  const fuente = mapa.getSource('recorrido');
  if (fuente) return fuente.setData(datos);
  mapa.addSource('recorrido', { type: 'geojson', data: datos });
  mapa.addLayer({
    id: 'recorrido', type: 'line', source: 'recorrido',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': COLOR_RECORRIDO, 'line-width': 4, 'line-dasharray': [1.2, 1.6] }
  });
}

/** Encuadra los puntos {latitud, longitud} con margen; un solo punto se centra con el zoom dado. */
export function encuadrar(mapa, puntos, { margen = 48, zoom = 15, animar = true } = {}) {
  if (!puntos.length) return;
  if (puntos.length === 1) {
    mapa[animar ? 'easeTo' : 'jumpTo']({ center: [puntos[0].longitud, puntos[0].latitud], zoom });
    return;
  }
  const lng = puntos.map(p => p.longitud);
  const lat = puntos.map(p => p.latitud);
  mapa.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]],
    { padding: margen, maxZoom: zoom, animate: animar && !matchMedia('(prefers-reduced-motion: reduce)').matches });
}
