// H22: parámetros versionados del motor beta, fases 1–2. Cada respuesta de Para ti indica la versión usada.
// Cambiar un valor exige cambiar la versión.

const congelar = objeto => Object.freeze(objeto);

export const CONFIGURACION = congelar({
  version: '2026-10-22.1',
  /** R = categoria·C + comercio·M + intencion·T. Similitud, criterios y comportamiento quedan para la fase 3. */
  pesos: congelar({ categoria: 20, comercio: 45, intencion: 15 }),
  variedad: congelar({ primeras: 5, maximoPorComercio: 2, penalizacionComercio: 20 }),
  /** Cada categoría declarada con candidatos aparece entre estas primeras posiciones. */
  coberturaCategorias: 6
});
