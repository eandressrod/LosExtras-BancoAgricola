// H8: mapa con MapLibre GL JS y teselas de OpenFreeMap (ADR-012). El motor se carga solo en las pantallas que lo usan.
// Las teselas son de otro origen: el service worker no las intercepta ni las guarda.

const BASE = '/vendor/maplibre-gl@6.16.0/';
const ESTILO = 'https://tiles.openfreemap.org/styles/liberty';
const ESPERA_MAXIMA_MS = 15000;
export const COLOR_RECORRIDO = '#1f5fd6';
let motor = null;

function cargarMotor() {
  if (!document.querySelector('link[data-maplibre]')) {
    const hoja = document.createElement('link');
    hoja.rel = 'stylesheet';
    hoja.href = BASE + 'maplibre-gl.css';
    hoja.dataset.maplibre = '';
    document.head.append(hoja);
  }
  motor ??= import(BASE + 'maplibre-gl.mjs').catch(error => { motor = null; throw error; });
  return motor;
}

/** Crea el mapa y espera a que cargue el estilo. Rechaza si el motor o las teselas no responden. */
export async function crearMapa(contenedor, { centro, zoom = 13, interactivo = true }) {
  const ml = await cargarMotor();
  const mapa = new ml.Map({
    container: contenedor, style: ESTILO, center: [centro.longitud, centro.latitud], zoom,
    interactive: interactivo, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false
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
