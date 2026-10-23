// Filtros explícitos de Para ti: categoría (H5), Disponibles hoy (H17) y búsqueda por comercio (H10).
// Solo restringen lo que ya aplica; nunca cambian las preferencias. Los usan /api/promociones y el motor.

/** Restringe a una categoría las ofertas que ya aplican a la tarjeta y los intereses; null es Todas. */
export function filtrarPorCategoria(promociones, categoria) {
  return categoria ? promociones.filter(promo => promo.category === categoria) : promociones;
}

/** Deja solo las ofertas aplicables que se pueden usar hoy; apagado devuelve la misma lista. */
export function filtrarDisponiblesHoy(promociones, hoy) {
  return hoy ? promociones.filter(promo => promo.availableToday) : promociones;
}

/** Filtra por coincidencia parcial en el nombre del comercio sin distinguir mayúsculas/minúsculas. */
export function filtrarPorComercio(promociones, comercio) {
  const termino = typeof comercio === 'string' ? comercio.trim().toLowerCase() : '';
  if (!termino) return promociones;
  return (promociones ?? []).filter(promo => {
    const nombre = String(promo.merchant ?? promo.comercio?.nombre ?? '').trim().toLowerCase();
    return nombre.includes(termino);
  });
}

/**
 * Aplica los tres filtros explícitos en cadena; el orden no altera el resultado porque cada uno solo restringe.
 * @param {import('./contrato.js').FiltrosExplicitos} filtros
 */
export function aplicarFiltros(promociones, { categoria = null, hoy = false, comercio = null } = {}) {
  return filtrarPorComercio(filtrarDisponiblesHoy(filtrarPorCategoria(promociones, categoria), hoy), comercio);
}

/** Indica si la persona activó algún filtro; el motor lo usa para explicar un listado vacío. */
export function hayFiltros({ categoria = null, hoy = false, comercio = null } = {}) {
  return Boolean(categoria || hoy || (typeof comercio === 'string' && comercio.trim()));
}
