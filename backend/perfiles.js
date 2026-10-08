import { obtenerRepositorio } from './repositorios/index.js';

export async function listarPerfiles() {
  return obtenerRepositorio().listarPerfiles();
}
