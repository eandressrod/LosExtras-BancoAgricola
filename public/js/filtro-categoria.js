// Filtro temporal de "Para ti" (H5). Vive en la URL y en la entrada del historial de esta pestaña,
// nunca en las preferencias guardadas. Cada entrada recuerda el perfil que la creó.

/** Categoría pedida en la URL, o null para Todas. Se descarta si la entrada es de otro perfil. */
export function leerCategoria(search, estado, perfilId) {
  if (estado?.perfil && estado.perfil !== perfilId) return null;
  const valores = new URLSearchParams(search).getAll('categoria');
  return valores.length === 1 && valores[0] && valores[0].length <= 100 ? valores[0] : null;
}

/** La categoría solo se aplica si existe en el catálogo vigente (/api/categorias). */
export function categoriaVigente(categoria, categorias) {
  return categorias.find(item => item.id === categoria) ?? null;
}

/** H17: Disponibles hoy está activo solo con hoy=1 y si la entrada es del mismo perfil. */
export function leerHoy(search, estado, perfilId) {
  if (estado?.perfil && estado.perfil !== perfilId) return false;
  const valores = new URLSearchParams(search).getAll('hoy');
  return valores.length === 1 && valores[0] === '1';
}

export function estadoNavegacion(perfilId, categoria) {
  return { perfil: perfilId, categoria };
}

// Filtros temporales de la URL, en orden fijo: categoría (H5) y Disponibles hoy (H17).
const parametros = (categoria, hoy) => [
  categoria && 'categoria=' + encodeURIComponent(categoria),
  hoy && 'hoy=1'
].filter(Boolean);

function consulta(categoria, hoy) {
  const lista = parametros(categoria, hoy);
  return lista.length ? '?' + lista.join('&') : '';
}

export function urlConsulta(categoria, hoy = false) {
  return '/api/promociones' + consulta(categoria, hoy);
}

export function urlListado(categoria, promocionId, hoy = false) {
  return '/promociones.html' + consulta(categoria, hoy) + (promocionId ? '#promo-' + encodeURIComponent(promocionId) : '');
}

export function urlDetalle(promocionId, categoria, hoy = false) {
  return ['/detalle.html?id=' + encodeURIComponent(promocionId), ...parametros(categoria, hoy)].join('&');
}
