// H22: alcance de Para ti. Entran las categorías declaradas y las de los comercios elegidos; con perfil vacío, todo lo elegible.

/**
 * Un filtro explícito de categoría abre su alcance en esa consulta: el filtro delimita, no las preferencias.
 * @param {object[]} ofertas ordenables
 * @param {ReturnType<import('./perfil.js').perfilDeSenales>} perfil
 * @param {string | null} categoriaFiltro
 */
export function enAlcance(ofertas, perfil, categoriaFiltro = null) {
  // Sin intereses no hay con qué recortar; con filtro de categoría, quien recorta es el filtro (filtros.js).
  if (categoriaFiltro || perfil.sinIntereses) return ofertas;
  // Elegir un comercio trae su categoría al alcance aunque no se haya declarado.
  const categorias = new Set(perfil.categorias);
  for (const oferta of ofertas) if (perfil.comercios.has(oferta.merchantId)) categorias.add(oferta.category);
  return ofertas.filter(oferta => categorias.has(oferta.category));
}
