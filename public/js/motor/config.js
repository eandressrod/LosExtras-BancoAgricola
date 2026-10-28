// H22 y H25: parámetros versionados del motor beta, fases 1–2. Cada respuesta de Para ti indica la versión usada.
// Cambiar un valor exige cambiar la versión.

const congelar = objeto => Object.freeze(objeto);

export const CONFIGURACION = congelar({
  version: '2026-10-26.1',
  /** R = categoria·C + comercio·M + intencion·T. Similitud, criterios y comportamiento quedan para la fase 3. */
  pesos: congelar({ categoria: 20, comercio: 45, intencion: 15 }),
  /**
   * H25: valor mínimo en el vector de ocasiones de la oferta para activar T = 1. Desde 2026-10-26.1 es 1: solo cuenta la
   * ocasión en torno a la que gira la oferta; con 0.5 («la incluye en parte») Pizza Hut y Claro subían en Entretenimiento.
   */
  umbralOcasion: 1,
  variedad: congelar({ primeras: 5, maximoPorComercio: 2, penalizacionComercio: 20 }),
  /** Cada categoría declarada con candidatos aparece entre estas primeras posiciones. */
  coberturaCategorias: 6
});
