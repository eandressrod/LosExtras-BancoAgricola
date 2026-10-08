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
 *
 * Perfil de la sesión (H1). Nunca incluye credenciales.
 * @typedef {Object} PerfilSesion
 * @property {string} id
 * @property {string} nombre
 * @property {'basica' | 'black'} tipoTarjeta
 *
 * @typedef {PerfilSesion & { contrasenaHash: string }} AccesoPerfil
 *
 * @typedef {Object} RepositorioAccesos
 * @property {(usuario: string) => Promise<AccesoPerfil | null>} buscarAccesoPorUsuario
 * @property {(id: string) => Promise<PerfilSesion | null>} buscarPerfilPorId
 */
export {};
