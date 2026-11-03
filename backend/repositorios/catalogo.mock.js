import { perfiles } from '../perfiles-prueba.js';
import { catalogoPromociones, zonasCatalogo } from '../catalogo.js';

/** @type {import('./contrato.js').RepositorioCatalogo} */
export const repositorioMock = {
  async listarPerfiles() { return perfiles.map(({ id, nombre }) => ({ id, nombre })); },
  async listarPromocionesConBeneficios() {
    return structuredClone(catalogoPromociones);
  },
  async listarZonas() { return structuredClone(zonasCatalogo); }
};
