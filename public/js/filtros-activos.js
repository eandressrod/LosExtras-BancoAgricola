// Sistema visual de Promociones: los filtros viven en la hoja Filtros; sobre la lista solo se ven los activos,
// como píldoras que se quitan con un toque. Funciones puras para la página de Para ti.
import { categoriaVigente } from './filtro-categoria.js';
import { etiquetaTarjeta } from './tarjeta-elegida.js';

/**
 * Píldoras de los filtros activos, en orden fijo: categoría (H5), tarjeta (H16) y aplica hoy (H17).
 * @param {{categoria: string | null, categorias: Array<{id: string, nombre: string}>, hoy: boolean, tarjeta: object | null}} estado
 * `tarjeta` es null con «Todas mis tarjetas».
 * @returns {Array<{tipo: 'categoria'|'tarjeta'|'hoy', texto: string}>}
 */
export function filtrosActivos({ categoria, categorias = [], hoy = false, tarjeta = null }) {
  const nombre = categoria && categoriaVigente(categoria, categorias)?.nombre;
  return [
    nombre && { tipo: 'categoria', texto: nombre },
    tarjeta && { tipo: 'tarjeta', texto: etiquetaTarjeta(tarjeta) },
    hoy && { tipo: 'hoy', texto: 'Aplica hoy' }
  ].filter(Boolean);
}

/** Nombre accesible del botón Filtros. */
export function textoBotonFiltros(cantidad) {
  if (!cantidad) return 'Filtros';
  return `Filtros, ${cantidad} ${cantidad === 1 ? 'activo' : 'activos'}`;
}
