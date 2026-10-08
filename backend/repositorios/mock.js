import { perfiles, promociones } from '../datos.js';

/** @type {import('./contrato.js').RepositorioCatalogo} */
export const repositorioMock = {
  async listarPerfiles() { return perfiles; },
  async listarPromociones() { return promociones; },
  async buscarPromocion(id) {
    return promociones.find(promocion => promocion.id === id) ?? null;
  }
};
