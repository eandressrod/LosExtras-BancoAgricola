import { obtenerRepositorio } from './repositorios/index.js';

export async function listarPromociones() {
  return obtenerRepositorio().listarPromociones();
}

export async function buscarPromocion(id) {
  return obtenerRepositorio().buscarPromocion(id);
}
