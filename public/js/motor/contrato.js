/**
 * H22 (SCRUM-128): contrato del motor de Para ti y del registro de señales.
 * Lo comparten el backend (/api/para-ti, /api/senales) y el cliente (vista previa de H21).
 * Ejemplos completos en docs/contrato-motor/ y datos de prueba en tests/fixtures/motor/.
 * Un cambio de este contrato se avisa en las historias que lo consumen (H20, H21, H23 y H25).
 *
 * @typedef {'interes'|'criterio'|'rechazo'} ClaseSenal
 * @typedef {'categoria'|'subcategoria'|'comercio'|'canal'|'beneficio'|'descubrir'|'zona'|'oferta'} AmbitoSenal
 * @typedef {'encuesta'|'pregunta'|'tarjeta'} OrigenSenal
 *
 * @typedef {Object} Senal Un hecho declarado por la persona. Quitar = desactivar; deshacer = reactivar.
 * @property {number} id
 * @property {ClaseSenal} clase
 * @property {AmbitoSenal} ambito Combinaciones válidas en AMBITOS_POR_CLASE (vocabulario.js).
 * @property {string} valor Id de categoría, subcategoría, comercio u oferta del catálogo; opción del criterio o 'indiferente'.
 * @property {OrigenSenal} origen
 * @property {string} creadaEn Fecha ISO 8601.
 * @property {boolean} activa
 * @property {true} [quitoEleccion] H23: solo en un rechazo·comercio que desactivó la elección del comercio (pierde M, sin × 0.3).
 *
 * @typedef {Object} Componentes Términos del puntaje de la fase 2: R = 20·C + 45·M + 15·T.
 * @property {0|1} C 1 si la categoría está declarada o si M = 1.
 * @property {0|1} M 1 si la persona eligió el comercio.
 * @property {number} T Intención del día (0 a 1); neutra hasta H25.
 * @property {number} R
 *
 * @typedef {{ tipo: 'comercio'|'categoria'|'intencion', texto: string }} Razon Término dominante de R.
 * @typedef {{ tipo: 'canal'|'beneficio', valor: string, texto: string }} Insignia Criterio declarado que la oferta cumple.
 *
 * @typedef {Object} BeneficioPropio SCRUM-133: beneficio de la oferta con una tarjeta propia del dueño de la sesión.
 * @property {string} tarjetaId
 * @property {'basica'|'black'} tipoTarjeta
 * @property {string} texto
 *
 * @typedef {import('../../../backend/repositorios/contrato.js').Promocion & {
 *   componentes: Componentes, razon: Razon | null, insignias: Insignia[], vencida?: boolean,
 *   mejorBeneficio?: BeneficioPropio, otrosBeneficios?: BeneficioPropio[]
 * }} OfertaOrdenada `vencida` la marca el cliente cuando la oferta vence durante la visita (instantánea).
 *   Sin ?tarjeta= (todas las tarjetas propias) la oferta suma `mejorBeneficio` y `otrosBeneficios`, del mejor al peor
 *   (regla en elegibilidad.js); `applicableCard`, `benefit`, `payment`, `restrictions`, `minimumPurchase` y `discountCap`
 *   son los del mejor. Con ?tarjeta= ninguno de los dos campos aparece.
 *
 * @typedef {Object} RespuestaParaTi
 * @property {string} version Versión de config.js.
 * @property {'base'|'personalizada'} estrategia 'base' con perfil sin intereses: orden por alta, sin razones.
 * @property {null|'sin-catalogo'|'filtros'|'intereses'} vacio Motivo cuando no hay promociones.
 * @property {OfertaOrdenada[]} promociones
 * @property {Array<{id: string, motivo: 'sin-beneficio'|'fuera-de-vigencia'|'sin-dias'|'sin-canal'}>} descartadas
 * @property {{tipo: 'excluir-categoria', categoria: string, nombre: string} | null} pregunta H23: la agrega /api/para-ti
 *   tras 3 «Menos» en comercios de una categoría; ordenarParaTi no la calcula.
 *
 * @typedef {Object} FiltrosExplicitos Restringen y nunca se alteran. La categoría abre su alcance en esa consulta.
 * @property {string | null} [categoria] H5
 * @property {boolean} [hoy] H17
 * @property {string | null} [comercio] H10
 *
 * @typedef {Object} ReglasExternas Funciones puras que aportan otras historias; por defecto no cambian nada.
 * @property {(oferta: object, perfil: object) => boolean} excluir H23: «No me interesa esta promo».
 * @property {(oferta: object, perfil: object) => number} multiplicador H23: «Menos de este comercio» (0.3).
 * @property {(oferta: object) => number} intencion H25: «Hoy busco», de 0 a 1.
 */
export {};
