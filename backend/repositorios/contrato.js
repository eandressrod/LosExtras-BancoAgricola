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
 * @property {string | null} imageUrl
 * @property {string | null} imageAlt
 * @property {string | null} logoUrl
 * @property {string} detailDescription
 * @property {string | null} validFrom Fecha YYYY-MM-DD
 * @property {string | null} validUntil Fecha YYYY-MM-DD
 * @property {number[] | null} usageDays Domingo=0, sábado=6
 * @property {'basica' | 'black'} applicableCard
 * @property {boolean} exclusive
 * @property {number | null} minimumPurchase
 * @property {number | null} discountCap
 * @property {boolean} expired
 * @property {boolean} upcoming
 * @property {boolean} canUse Solo vigencia; días/restricciones se muestran aparte.
 *
 * @typedef {Object} RepositorioCatalogo
 * @property {() => Promise<Perfil[]>} listarPerfiles
 * @property {() => Promise<Promocion[]>} listarPromociones
 * @property {() => Promise<Array<Promocion & { beneficios: Array<{ tipo_tarjeta: string, beneficio: string, medio_pago: string, restricciones: string }> }>>} listarPromocionesConBeneficios
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
 * @property {(id: string) => Promise<boolean>} sesionRevocada
 * @property {(sesion: { id: string, perfilId: string, expiraEn: number }) => Promise<void>} revocarSesion
 */
export {};
