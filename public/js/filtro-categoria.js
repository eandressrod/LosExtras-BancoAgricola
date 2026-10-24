// Filtro temporal de "Para ti" (H5, H17, H10) e intención del día (H25). Viven en la URL y en la entrada del historial
// de esta pestaña, nunca en las preferencias guardadas. Cada entrada recuerda el perfil que la creó.

const congelar = objeto => Object.freeze(objeto);

export const CHIPS_HOY_BUSCO = congelar([
  congelar({ id: 'dia-a-dia', nombre: 'Compras del día a día', tipo: 'ocasion' }),
  congelar({ id: 'rapido-practico', nombre: 'Rápido y práctico', tipo: 'ocasion' }),
  congelar({ id: 'darse-un-gusto', nombre: 'Darse un gusto', tipo: 'ocasion' }),
  congelar({ id: 'salir', nombre: 'Salir con amigos o pareja', tipo: 'ocasion' }),
  congelar({ id: 'familia', nombre: 'Planes en familia', tipo: 'ocasion' }),
  congelar({ id: 'bienestar', nombre: 'Bienestar y vida activa', tipo: 'ocasion' }),
  congelar({ id: 'entretenimiento', nombre: 'Entretenimiento', tipo: 'ocasion' }),
  congelar({ id: 'estilo-personal', nombre: 'Estilo personal', tipo: 'ocasion' }),
  congelar({ id: 'tecnologia', nombre: 'Tecnología', tipo: 'ocasion' }),
  congelar({ id: 'hogar', nombre: 'Hogar', tipo: 'ocasion' }),
  congelar({ id: 'viajes', nombre: 'Viajes y escapadas', tipo: 'ocasion' }),
  congelar({ id: 'regalo', nombre: 'Regalo', tipo: 'etiqueta' })
]);

const POR_ID = new Map(CHIPS_HOY_BUSCO.map(chip => [chip.id, chip]));

export function normalizarIntencion(valor) {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return POR_ID.has(limpio) ? limpio : null;
}

export function textoPrimeroHoyBusco(intencionId) {
  const chip = POR_ID.get(normalizarIntencion(intencionId));
  return chip ? `Primero: ${chip.nombre.toLowerCase()}` : '';
}

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

/** H10: normaliza el texto de búsqueda recortando espacios al inicio y al final; vacío es null. */
export function normalizarBusqueda(texto) {
  if (typeof texto !== 'string') return null;
  const limpio = texto.trim();
  return limpio.length > 0 && limpio.length <= 100 ? limpio : null;
}

/** H10: texto de comercio en la URL, o null si está vacío o la entrada es de otro perfil. */
export function leerBusqueda(search, estado, perfilId) {
  if (estado?.perfil && estado.perfil !== perfilId) return null;
  const valores = new URLSearchParams(search).getAll('comercio');
  return valores.length === 1 ? normalizarBusqueda(valores[0]) : null;
}

/** H25: chip «Hoy busco» activo en la URL, o null si no hay o la entrada es de otro perfil. */
export function leerIntencion(search, estado, perfilId) {
  if (estado?.perfil && estado.perfil !== perfilId) return null;
  const valores = new URLSearchParams(search).getAll('intencion');
  return valores.length === 1 ? normalizarIntencion(valores[0]) : null;
}

export function estadoNavegacion(perfilId, categoria) {
  return { perfil: perfilId, categoria };
}

// Parámetros temporales de la URL, en orden fijo: categoría (H5), Disponibles hoy (H17), comercio (H10) e intención (H25).
const parametros = (categoria, hoy, comercio = null, intencion = null) => {
  const busqueda = normalizarBusqueda(comercio);
  const chip = normalizarIntencion(intencion);
  return [
    categoria && 'categoria=' + encodeURIComponent(categoria),
    hoy && 'hoy=1',
    busqueda && 'comercio=' + encodeURIComponent(busqueda),
    chip && 'intencion=' + encodeURIComponent(chip)
  ].filter(Boolean);
};

function consulta(categoria, hoy, comercio = null, intencion = null) {
  const lista = parametros(categoria, hoy, comercio, intencion);
  return lista.length ? '?' + lista.join('&') : '';
}

/** H22 y H25: Para ti consulta el orden del motor con los filtros temporales y la intención del día. */
export function urlConsulta(categoria, hoy = false, comercio = null, intencion = null) {
  return '/api/para-ti' + consulta(categoria, hoy, comercio, intencion);
}

export function urlListado(categoria, promocionId, hoy = false, comercio = null, intencion = null) {
  return '/promociones.html' + consulta(categoria, hoy, comercio, intencion) + (promocionId ? '#promo-' + encodeURIComponent(promocionId) : '');
}

export function urlDetalle(promocionId, categoria, hoy = false, comercio = null, intencion = null) {
  return ['/detalle.html?id=' + encodeURIComponent(promocionId), ...parametros(categoria, hoy, comercio, intencion)].join('&');
}
