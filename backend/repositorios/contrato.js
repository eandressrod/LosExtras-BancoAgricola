/**
 * Contrato de consulta compartido por mock y Supabase.
 * La API conserva los mismos nombres de campos con ambos adaptadores.
 *
 * @typedef {Object} Perfil
 * @property {string} id
 * @property {string} nombre
 *
 * @typedef {Object} Promocion
 * @property {string} id
 * @property {string} merchant
 * @property {string} category
 * @property {string} benefit
 * @property {string} description
 * @property {string} payment
 * @property {string} restrictions
 *
 * @typedef {Object} RepositorioCatalogo
 * @property {() => Promise<Perfil[]>} listarPerfiles
 * @property {() => Promise<Promocion[]>} listarPromociones
 * @property {(id: string) => Promise<Promocion | null>} buscarPromocion
 */
export {};
