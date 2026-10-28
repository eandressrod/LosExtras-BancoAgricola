// H8: enlaces externos de navegación. Llevan solo el destino; la app del teléfono pone el origen.

const coordenada = ({ latitud, longitud }) => `${latitud},${longitud}`;

/** Abre Waze con la navegación hacia el destino (https://developers.google.com/waze/deeplinks). */
export function enlaceWaze(destino) {
  const url = new URL('https://waze.com/ul');
  url.searchParams.set('ll', coordenada(destino));
  url.searchParams.set('navigate', 'yes');
  return url.href;
}

/** Abre Google Maps con indicaciones hacia el destino, sin clave (https://developers.google.com/maps/documentation/urls). */
export function enlaceGoogleMaps(destino) {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', coordenada(destino));
  return url.href;
}
