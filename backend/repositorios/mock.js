import { perfiles, promociones } from '../datos.js';
import { catalogoPromociones } from '../catalogo.js';

/** @type {import('./contrato.js').RepositorioCatalogo} */
export const repositorioMock = {
  async listarPerfiles() { return perfiles.map(({ id, nombre }) => ({ id, nombre })); },
  async listarPromociones() { return promociones; },
  async listarPromocionesConBeneficios() {
    return structuredClone(catalogoPromociones);
  },
  async buscarPromocion(id) {
    return promociones.find(promocion => promocion.id === id) ?? null;
  }
};
