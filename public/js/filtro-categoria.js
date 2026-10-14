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

export function estadoNavegacion(perfilId, categoria) {
  return { perfil: perfilId, categoria };
}

const parametro = categoria => 'categoria=' + encodeURIComponent(categoria);

export function urlConsulta(categoria) {
  return '/api/promociones' + (categoria ? '?' + parametro(categoria) : '');
}

export function urlListado(categoria, promocionId) {
  return '/promociones.html' + (categoria ? '?' + parametro(categoria) : '') + (promocionId ? '#promo-' + encodeURIComponent(promocionId) : '');
}

export function urlDetalle(promocionId, categoria) {
  return '/detalle.html?id=' + encodeURIComponent(promocionId) + (categoria ? '&' + parametro(categoria) : '');
}
