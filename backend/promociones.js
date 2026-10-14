import { obtenerRepositorio } from './repositorios/index.js';
import { CATEGORIAS_PERMITIDAS } from './servicios/preferencias.js';

export async function listarPromociones() {
  return obtenerRepositorio().listarPromociones();
}

export async function buscarPromocion(id) {
  return obtenerRepositorio().buscarPromocion(id);
}

const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' });

export function filtrarPromociones(promociones, tipoTarjeta, categoriasPreferidas, ahora = new Date()) {
  const hoy = fechaLocal.format(ahora);
  return (promociones ?? []).flatMap(({ beneficios, comercio, ...promo }) => {
    if (categoriasPreferidas.length && !categoriasPreferidas.includes(promo.category)) return [];
    const beneficio = beneficios?.find(item => item.tipo_tarjeta === tipoTarjeta);
    if (!beneficio) return [];
    const expired = Boolean(promo.validUntil && hoy > promo.validUntil);
    const upcoming = Boolean(promo.validFrom && hoy < promo.validFrom);
    return [{
      ...promo, merchant: comercio?.nombre ?? promo.merchant,
      logoUrl: comercio?.logoUrl ?? promo.logoUrl ?? null,
      benefit: beneficio.beneficio, payment: beneficio.medio_pago, restrictions: beneficio.restricciones,
      applicableCard: tipoTarjeta, exclusive: new Set(beneficios.map(item => item.tipo_tarjeta)).size === 1,
      minimumPurchase: beneficio.compra_minima == null ? null : Number(beneficio.compra_minima),
      discountCap: beneficio.tope_descuento == null ? null : Number(beneficio.tope_descuento),
      expired, upcoming, canUse: !expired && !upcoming
    }];
  });
}

/**
 * Filtro temporal de H5. Sin parámetro `categoria` equivale a Todas; si viene, debe ser
 * una sola categoría conocida. No se guarda: las preferencias del usuario no cambian.
 * @param {URLSearchParams} parametros
 * @returns {{ ok: true, categoria: string | null } | { ok: false }}
 */
export function leerCategoriaTemporal(parametros) {
  const valores = parametros.getAll('categoria');
  if (valores.length === 0) return { ok: true, categoria: null };
  if (valores.length === 1 && CATEGORIAS_PERMITIDAS.has(valores[0])) return { ok: true, categoria: valores[0] };
  return { ok: false };
}

/** Restringe a una categoría las ofertas que ya aplican a la tarjeta y los intereses; null es Todas. */
export function filtrarPorCategoria(promociones, categoria) {
  return categoria ? promociones.filter(promo => promo.category === categoria) : promociones;
}
