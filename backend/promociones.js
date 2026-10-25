import { obtenerRepositorio } from './repositorios/index.js';
import { CATEGORIAS_PERMITIDAS } from './servicios/preferencias.js';

// Los filtros explícitos viven con el motor para que el backend y el cliente usen la misma copia.
export { filtrarPorCategoria, filtrarDisponiblesHoy, filtrarPorComercio } from '../public/js/motor/filtros.js';
import { ordenarBeneficios } from '../public/js/motor/elegibilidad.js';

export async function listarPromociones() {
  return obtenerRepositorio().listarPromociones();
}

export async function buscarPromocion(id) {
  return obtenerRepositorio().buscarPromocion(id);
}

const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' });

/** Fecha real con formato YYYY-MM-DD; descarta textos como 2026-02-30. */
function esFecha(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(valor + 'T00:00:00Z');
  return !Number.isNaN(fecha.getTime()) && fecha.toISOString().startsWith(valor);
}

/** null = cualquier día; si hay lista, solo enteros de domingo (0) a sábado (6). */
function diasValidos(dias) {
  return dias == null || (Array.isArray(dias) && dias.length > 0 && dias.every(dia => Number.isInteger(dia) && dia >= 0 && dia <= 6));
}

/**
 * H17: la oferta se puede usar hoy (fecha civil de El Salvador) según su vigencia inclusiva y sus días
 * permitidos. Una fecha ausente o no válida nunca se presenta como disponibilidad confirmada.
 */
export function disponibleHoy(promo, ahora = new Date()) {
  const { validFrom, validUntil, usageDays } = promo;
  if (!esFecha(validFrom) || !esFecha(validUntil) || validFrom > validUntil || !diasValidos(usageDays)) return false;
  const hoy = fechaLocal.format(ahora);
  if (hoy < validFrom || hoy > validUntil) return false;
  return usageDays == null || usageDays.includes(new Date(hoy + 'T00:00:00Z').getUTCDay());
}

/** H24: campos del contrato del catálogo. Ocasiones y nivel de precio de la promoción sobrescriben los del comercio. */
function camposCatalogo({ sucursales, occasions, priceLevel, restrictions }, comercio) {
  return {
    generalRestrictions: restrictions ?? null,
    occasions: occasions ?? comercio?.occasions ?? null,
    priceLevel: priceLevel ?? comercio?.priceLevel ?? null,
    merchantId: comercio?.id ?? null,
    subcategoryId: comercio?.subcategoria?.id ?? null,
    subcategoryName: comercio?.subcategoria?.nombre ?? null,
    recognizable: comercio?.recognizable ?? null,
    sensitive: comercio?.sensitive ?? null,
    refineBy: comercio?.refineBy ?? null,
    branches: (sucursales ?? []).map(({ sucursal }) => ({
      id: sucursal.id, name: sucursal.nombre, address: sucursal.direccion, latitude: sucursal.latitud, longitude: sucursal.longitud,
      zoneId: sucursal.zonaId
    })),
    coverage: (comercio?.cobertura ?? []).map(({ zonaId, estado }) => ({ zoneId: zonaId, status: estado }))
  };
}

/**
 * SCRUM-133: beneficios de las tarjetas propias que aplican a la oferta, del mejor al peor (regla en elegibilidad.js).
 * @returns {{ mejorBeneficio: object, otrosBeneficios: object[] } | null} null si ninguna tarjeta propia aplica.
 */
function beneficiosDeTodas(beneficios, { tarjetas, predeterminadaId }) {
  const candidatos = tarjetas.flatMap(tarjeta => {
    const fila = beneficios?.find(item => item.tipo_tarjeta === tarjeta.tipoTarjeta);
    return fila ? [{ tarjetaId: tarjeta.id, tipoTarjeta: tarjeta.tipoTarjeta, texto: fila.beneficio }] : [];
  });
  if (!candidatos.length) return null;
  const [mejorBeneficio, ...otrosBeneficios] = ordenarBeneficios(candidatos, predeterminadaId);
  return { mejorBeneficio, otrosBeneficios };
}

/**
 * Aplana el catálogo para una tarjeta. `alcance` es el tipo de la tarjeta elegida ('basica' o 'black') o, sin ?tarjeta=,
 * `{ tarjetas, predeterminadaId }` con todas las propias: la oferta entra si aplica con al menos una, sus campos de
 * beneficio son los del mejor y suma mejorBeneficio y otrosBeneficios.
 */
export function filtrarPromociones(promociones, alcance, categoriasPreferidas, ahora = new Date()) {
  const hoy = fechaLocal.format(ahora);
  const todas = typeof alcance === 'object' && alcance !== null;
  return (promociones ?? []).flatMap(({ beneficios, comercio, categoria, sucursales, ...promo }) => {
    if (categoriasPreferidas.length && !categoriasPreferidas.includes(promo.category)) return [];
    const propios = todas ? beneficiosDeTodas(beneficios, alcance) : null;
    const tipoTarjeta = todas ? propios?.mejorBeneficio.tipoTarjeta : alcance;
    const beneficio = beneficios?.find(item => item.tipo_tarjeta === tipoTarjeta);
    if (!beneficio) return [];
    const expired = Boolean(promo.validUntil && hoy > promo.validUntil);
    const upcoming = Boolean(promo.validFrom && hoy < promo.validFrom);
    return [{
      ...promo, ...camposCatalogo({ ...promo, sucursales }, comercio),
      categoryName: categoria?.nombre ?? promo.category, merchant: comercio?.nombre ?? promo.merchant,
      logoUrl: comercio?.logoUrl ?? promo.logoUrl ?? null,
      benefit: beneficio.beneficio, payment: beneficio.medio_pago, restrictions: beneficio.restricciones,
      applicableCard: tipoTarjeta, exclusive: new Set(beneficios.map(item => item.tipo_tarjeta)).size === 1,
      minimumPurchase: beneficio.compra_minima == null ? null : Number(beneficio.compra_minima),
      discountCap: beneficio.tope_descuento == null ? null : Number(beneficio.tope_descuento),
      expired, upcoming, canUse: !expired && !upcoming,
      availableToday: disponibleHoy(promo, ahora),
      ...propios
    }];
  });
}

/**
 * Filtro temporal de H5. Sin parámetro `categoria` equivale a Todas; si viene, debe ser
 * una sola categoría vigente del catálogo. No se guarda: las preferencias no cambian.
 * @param {URLSearchParams} parametros
 * @param {Set<string>} vigentes identificadores de la tabla categorias
 * @returns {{ ok: true, categoria: string | null } | { ok: false }}
 */
export function leerCategoriaTemporal(parametros, vigentes = CATEGORIAS_PERMITIDAS) {
  const valores = parametros.getAll('categoria');
  if (valores.length === 0) return { ok: true, categoria: null };
  if (valores.length === 1 && vigentes.has(valores[0])) return { ok: true, categoria: valores[0] };
  return { ok: false };
}

/**
 * Filtro Disponibles hoy de H17. Sin parámetro `hoy` es el listado habitual; `hoy=1` lo activa.
 * Como el de categoría, es temporal y no cambia las preferencias.
 * @param {URLSearchParams} parametros
 * @returns {{ ok: true, hoy: boolean } | { ok: false }}
 */
export function leerDisponibleHoy(parametros) {
  const valores = parametros.getAll('hoy');
  if (valores.length === 0) return { ok: true, hoy: false };
  if (valores.length === 1 && valores[0] === '1') return { ok: true, hoy: true };
  return { ok: false };
}

/**
 * Búsqueda temporal por nombre de comercio de H10. Recorta espacios al inicio/final;
 * vacío o ausente equivale a no filtrar por comercio. No modifica las preferencias.
 * @param {URLSearchParams} parametros
 * @returns {{ ok: true, comercio: string | null } | { ok: false }}
 */
export function leerBusquedaComercio(parametros) {
  const valores = parametros.getAll('comercio');
  if (valores.length === 0) return { ok: true, comercio: null };
  if (valores.length > 1) return { ok: false };
  const limpio = valores[0].trim();
  if (limpio.length > 100) return { ok: false };
  return { ok: true, comercio: limpio || null };
}
