// H8: línea de recorrido aproximada del detalle. Es esquemática, sin servicio de rutas, y no sigue las calles.

/** Coordenadas GeoJSON [longitud, latitud] del origen al destino con un codo intermedio. */
export function recorridoAproximado(origen, destino) {
  return [
    [origen.longitud, origen.latitud],
    [destino.longitud, origen.latitud],
    [destino.longitud, destino.latitud]
  ];
}
