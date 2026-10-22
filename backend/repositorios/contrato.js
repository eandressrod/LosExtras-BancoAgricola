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
 * Campos del contrato del catálogo (H24); el detalle de cada uno está en catalogo/esquema.json.
 * @property {string} title
 * @property {string} conditions
 * @property {string} instructions
 * @property {string} generalRestrictions Restricciones de la promoción; `restrictions` son las de la tarjeta.
 * @property {Array<'presencial'|'delivery'|'en-linea'>} channels
 * @property {'descuento'|'2x1-combo'|'cuotas-sin-intereses'|'cashback-puntos'} benefitType
 * @property {string} decisiveCondition
 * @property {string[]} intentTags
 * @property {string} addedOn Fecha de alta YYYY-MM-DD
 * @property {Record<string, 0|0.5|1>} occasions De la promoción o, si no tiene, de su comercio; vacío en comercios sensibles.
 * @property {1|2|3} priceLevel De la promoción o, si no tiene, de su comercio.
 * @property {string} merchantId
 * @property {string} subcategoryId
 * @property {string} subcategoryName
 * @property {boolean} recognizable
 * @property {boolean} sensitive
 * @property {'comercio'|'subcategoria'|'no'} refineBy
 * @property {Array<{id: string, name: string, address: string, latitude: number, longitude: number, zoneId: string}>} branches Sucursales participantes.
 * @property {Array<{zoneId: string, status: 'si'|'no'|'desconocida'}>} coverage Cobertura a domicilio del comercio.
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
 * @property {(sesion: { id: string, perfilId: string, creadaEn: number, expiraEn: number }, renovar?: boolean) => Promise<{ahora: number, inactivaEn: number}|null>} estadoActividad
 * @property {(sesion: { id: string, perfilId: string, expiraEn: number }) => Promise<void>} revocarSesion
 */
export {};

/** H19: referencia visual de producto; no determina elegibilidad en Promociones.
 * @typedef {{ id: string, nombre: string, modalidad: 'débito'|'crédito', red: 'Visa'|'Mastercard', descripcion: string }} ProductoTarjeta
 * @typedef {{ id: string, cuentaId: string, cuenta: {id:string,numeroCompleto:string}, tipoTarjeta:'basica'|'black', productoId: string, producto: ProductoTarjeta, numeroEnmascarado: string, saldo: number, moneda: string }} TarjetaMenu
 * @typedef {{ id: string, nombre: string, objetivo: number, ahorrado: number, moneda: 'USD' }} MetaUsuario
 * @typedef {{ id: string, titulo: string, texto: string, fecha: string, leido: boolean }} MensajeUsuario
 * @typedef {Object} RepositorioProductosMenu
 * @property {(perfilId:string) => Promise<TarjetaMenu[]>} listarTarjetas
 * @property {(perfilId: string) => Promise<{tarjetas: TarjetaMenu[], puntos: number, productosDisponibles: ProductoTarjeta[], mensajesPendientes: number}>} resumen
 * @property {(perfilId: string) => Promise<MensajeUsuario[]>} listarMensajes
 * @property {(perfilId: string, id: string) => Promise<MensajeUsuario|null>} leerMensaje
 * @property {(perfilId: string) => Promise<MetaUsuario[]>} listarMetas
 * @property {(perfilId: string, datos: Omit<MetaUsuario,'id'>) => Promise<MetaUsuario>} crearMeta
 * @property {(perfilId: string, id: string, datos: Omit<MetaUsuario,'id'>) => Promise<MetaUsuario|null>} editarMeta
 * @property {(perfilId: string, id: string) => Promise<boolean>} eliminarMeta
 */
