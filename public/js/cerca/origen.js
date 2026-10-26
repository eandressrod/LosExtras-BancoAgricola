// H8: origen de Cerca de ti y de la distancia del detalle.
// La posición vive solo en memoria: aquí se guarda qué eligió la persona (ubicación o zona), nunca las coordenadas.

export const OPCIONES_UBICACION = Object.freeze({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
const CLAVE = 'bancoagricola-cerca-origen';
/** Cámara del mapa de Cerca de ti para volver del detalle (js/cerca/pantalla.js); nunca guarda la posición del dispositivo. */
export const CLAVE_VISTA = 'bancoagricola-cerca-vista';
const MOTIVOS = { 1: 'denegada', 2: 'no-disponible', 3: 'tiempo' };

const motivo = error => MOTIVOS[error?.code] ?? 'no-disponible';
const posicion = ({ coords }) => ({ latitud: coords.latitude, longitud: coords.longitude });

/** Una lectura con tiempo límite. Nunca rechaza: devuelve {ok, latitud, longitud} o {ok: false, motivo}. */
export function leerUbicacion(geolocalizacion) {
  if (!geolocalizacion?.getCurrentPosition) return Promise.resolve({ ok: false, motivo: 'no-disponible' });
  return new Promise(resolver => geolocalizacion.getCurrentPosition(
    lectura => resolver({ ok: true, ...posicion(lectura) }),
    error => resolver({ ok: false, motivo: motivo(error) }),
    OPCIONES_UBICACION
  ));
}

/**
 * true solo si el permiso ya está concedido. Al abrir se usa para no mostrar el aviso sin que la persona lo pida;
 * si el navegador no informa el estado (o informa mal, como iOS), se vuelve a la zona y el botón sigue disponible.
 */
export async function permisoConcedido(permisos) {
  try { return (await permisos.query({ name: 'geolocation' })).state === 'granted'; } catch { return false; }
}

/** Sigue la posición mientras la pantalla la necesite. Devuelve la función que detiene el seguimiento. */
export function seguirUbicacion(geolocalizacion, alCambiar, alFallar) {
  if (!geolocalizacion?.watchPosition) {
    alFallar('no-disponible');
    return () => {};
  }
  let id = geolocalizacion.watchPosition(lectura => alCambiar(posicion(lectura)), error => alFallar(motivo(error)), OPCIONES_UBICACION);
  return () => {
    if (id === null) return;
    geolocalizacion.clearWatch(id);
    id = null;
  };
}

/** Guarda la elección del perfil para la visita: {tipo: 'ubicacion'} o {tipo: 'zona', zonaId}. */
export function guardarEleccion(almacen, perfilId, eleccion) {
  const valor = eleccion.tipo === 'zona' ? { tipo: 'zona', zonaId: eleccion.zonaId } : { tipo: 'ubicacion' };
  try { almacen.setItem(CLAVE, JSON.stringify({ perfilId, ...valor })); } catch { /* Sin almacenamiento, la elección dura la página. */ }
}

/** La elección de este perfil, o null. Si era de otro perfil, se borra. */
export function leerEleccion(almacen, perfilId) {
  try {
    const { perfilId: dueno, ...eleccion } = JSON.parse(almacen.getItem(CLAVE)) ?? {};
    if (dueno === perfilId && (eleccion.tipo === 'ubicacion' || (eleccion.tipo === 'zona' && eleccion.zonaId))) return eleccion;
    if (dueno) almacen.removeItem(CLAVE);
  } catch { /* Valor dañado o almacenamiento bloqueado: se vuelve a preguntar. */ }
  return null;
}

/** Olvida la elección y la vista del mapa: al iniciar o cerrar sesión. */
export function limpiarEleccion(almacen) {
  try {
    almacen.removeItem(CLAVE);
    almacen.removeItem(CLAVE_VISTA);
  } catch { /* Nada que limpiar. */ }
}

/** Origen a partir de la lista de zonas: el centro de la zona elegida. */
export function origenDeZona(zonas, zonaId) {
  const zona = zonas.find(z => z.id === zonaId);
  return zona ? { tipo: 'zona', zonaId: zona.id, nombre: zona.nombre, latitud: zona.latitud, longitud: zona.longitud } : null;
}
