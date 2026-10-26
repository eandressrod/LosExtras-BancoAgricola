// H22: vocabulario del registro de señales declaradas. El perfil guarda hechos, nunca puntajes (ADR-004).

// Qué ámbitos admite cada clase. La migración de senales_usuario repite esta tabla como CHECK.
//   interés: lo que la persona quiere ver; criterio: cómo lo prefiere; rechazo: lo que no quiere ver (H23).
export const AMBITOS_POR_CLASE = Object.freeze({
  interes: Object.freeze(['categoria', 'subcategoria', 'comercio']),
  criterio: Object.freeze(['canal', 'beneficio', 'descubrir', 'zona']),
  rechazo: Object.freeze(['oferta', 'comercio', 'categoria'])
});

// Dónde se declaró la señal: la encuesta inicial, una pregunta posterior o una acción sobre una tarjeta de oferta.
export const ORIGENES = Object.freeze(['encuesta', 'pregunta', 'tarjeta']);

/** «De todo un poco» y «Me da igual»: indiferencia declarada, distinta de no haber respondido. */
export const INDIFERENTE = 'indiferente';

/** Valores cerrados de los criterios; los mismos del catálogo de H24 más la indiferencia declarada. */
export const VALORES_CRITERIO = Object.freeze({
  canal: Object.freeze(['presencial', 'delivery', 'en-linea', INDIFERENTE]),
  beneficio: Object.freeze(['descuento', '2x1-combo', 'cuotas-sin-intereses', 'cashback-puntos', INDIFERENTE]),
  descubrir: Object.freeze(['siempre', 'mezcla', 'nuevos'])
});

const LONGITUD_MAXIMA = 100;

/**
 * Motivo por el que la entrada no es una señal válida, o null si lo es.
 * @param {unknown} entrada {clase, ambito, valor, origen}
 * @returns {string | null}
 */
export function validarSenal(entrada) {
  // Solo forma y vocabulario. Que el valor exista en el catálogo lo comprueba el handler de /api/senales.
  const { clase, ambito, valor, origen } = entrada !== null && typeof entrada === 'object' && !Array.isArray(entrada) ? entrada : {};
  if (!Object.hasOwn(AMBITOS_POR_CLASE, clase)) return 'La clase de la señal no es válida.';
  if (!AMBITOS_POR_CLASE[clase].includes(ambito)) return 'El ámbito no corresponde a la clase de la señal.';
  if (typeof valor !== 'string' || !valor.trim() || valor.length > LONGITUD_MAXIMA) return 'El valor de la señal no es válido.';
  if (clase === 'criterio' && VALORES_CRITERIO[ambito] && !VALORES_CRITERIO[ambito].includes(valor)) return 'El valor de la señal no es válido.';
  if (!ORIGENES.includes(origen)) return 'El origen de la señal no es válido.';
  return null;
}
