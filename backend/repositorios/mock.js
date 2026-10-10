import { perfiles, promociones } from '../datos.js';

/** @type {import('./contrato.js').RepositorioCatalogo} */
export const repositorioMock = {
  async listarPerfiles() { return perfiles.map(({ id, nombre }) => ({ id, nombre })); },
  async listarPromociones() { return promociones; },
  async listarPromocionesConBeneficios() {
    return promociones.map(promo => ({ ...promo, beneficios: ['basica', 'black'].map(tipo_tarjeta => ({
      tipo_tarjeta, beneficio: promo.benefit, medio_pago: promo.payment, restricciones: promo.restrictions
    })) }));
  },
  async buscarPromocion(id) {
    return promociones.find(promocion => promocion.id === id) ?? null;
  }
};
