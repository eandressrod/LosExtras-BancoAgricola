import { obtenerRepositorio } from './repositorios/index.js';

export async function listarPromociones() {
  return obtenerRepositorio().listarPromociones();
}

export async function buscarPromocion(id) {
  return obtenerRepositorio().buscarPromocion(id);
}

export function filtrarPromociones(promociones, tipoTarjeta, categoriasPreferidas) {
  if (!promociones) return [];
  
  return promociones.filter(promo => {
    // Si no tiene categorías guardadas, le mostramos todo, si no, filtramos.
    const aplicaCategoria = categoriasPreferidas.length === 0 || categoriasPreferidas.includes(promo.category);
    
    // Verificamos si la tarjeta del usuario está en el arreglo de tarjetas aplicables
    const aplicaTarjeta = promo.applicable_cards && promo.applicable_cards.includes(tipoTarjeta);
    
    return aplicaCategoria && aplicaTarjeta;
  });
}