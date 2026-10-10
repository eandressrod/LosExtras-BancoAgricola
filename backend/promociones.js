import { obtenerRepositorio } from './repositorios/index.js';

export async function listarPromociones() {
  return obtenerRepositorio().listarPromociones();
}

export async function buscarPromocion(id) {
  return obtenerRepositorio().buscarPromocion(id);
}

export function filtrarPromociones(promociones, tipoTarjeta, categoriasPreferidas) {
  return (promociones ?? []).flatMap(({ beneficios, ...promo }) => {
    if (categoriasPreferidas.length && !categoriasPreferidas.includes(promo.category)) return [];
    const beneficio = beneficios?.find(item => item.tipo_tarjeta === tipoTarjeta);
    if (!beneficio) return [];
    return [{ ...promo, benefit: beneficio.beneficio, payment: beneficio.medio_pago, restrictions: beneficio.restricciones }];
  });
}
