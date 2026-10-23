// H22: armado de la lista posición por posición. El puntaje decide la prioridad; la variedad evita que se llene de lo mismo.
//
// En cada posición se parte de las ofertas que faltan por colocar y se recorta el conjunto en dos pasos:
//   a. Variedad (primeras 5): fuera los comercios que ya tienen 2 ofertas, salvo que no quede alternativa pertinente.
//   b. Cobertura (primeras 6): si quedan justo tantas posiciones como categorías declaradas sin aparecer,
//      la posición se reserva para una de ellas.
// Del conjunto que queda gana el mayor valor ajustado (R − 20 si su comercio ya está entre las primeras 5).
// El armado es determinista porque los empates se resuelven siempre con compararDesempate.

/** Desempate fijo: aplica hoy, fecha de alta más reciente e id. */
export function compararDesempate(a, b) {
  return Number(Boolean(b.availableToday)) - Number(Boolean(a.availableToday))
    || String(b.addedOn ?? '').localeCompare(String(a.addedOn ?? ''))
    || String(a.id).localeCompare(String(b.id));
}

/**
 * @param {object[]} candidatas
 * @param {object} opciones
 * @param {(oferta: object) => number} [opciones.valor] R de cada oferta; la estrategia base usa 0.
 * @param {(oferta: object) => boolean} [opciones.pertinente] Solo una alternativa pertinente justifica limitar a un comercio.
 * @param {string[]} [opciones.categoriasCubrir] Categorías declaradas que deben aparecer entre las primeras posiciones.
 * @param {boolean} [opciones.penalizar] Resta la penalización cuando el comercio ya está entre las primeras.
 * @param {object} opciones.config
 */
export function armarLista(candidatas, { valor = () => 0, pertinente = () => true, categoriasCubrir = [], penalizar = true, config }) {
  const { primeras, maximoPorComercio, penalizacionComercio } = config.variedad;
  // Ordenar primero por desempate permite elegir con un reduce que conserva la primera ante valores iguales.
  const restantes = [...candidatas].sort(compararDesempate);
  const lista = [];
  while (restantes.length) {
    const posicion = lista.length;
    // Cuántas ofertas de un comercio hay ya entre las primeras posiciones de la lista.
    const enPrimeras = comercio => lista.slice(0, primeras).filter(oferta => oferta.merchantId === comercio).length;
    let opciones = restantes;
    // a. Variedad: solo se limita cuando, al limitar, todavía queda algo pertinente que mostrar.
    if (posicion < primeras) {
      const variadas = opciones.filter(oferta => enPrimeras(oferta.merchantId) < maximoPorComercio);
      if (variadas.some(pertinente)) opciones = variadas;
    }
    // b. Cobertura: se reserva la posición solo cuando esperar más dejaría alguna categoría declarada fuera de las primeras.
    if (posicion < config.coberturaCategorias) {
      const colocadas = new Set(lista.map(oferta => oferta.category));
      const faltan = categoriasCubrir.filter(categoria =>
        !colocadas.has(categoria) && opciones.some(oferta => oferta.category === categoria && pertinente(oferta)));
      if (faltan.length && faltan.length >= config.coberturaCategorias - posicion) {
        opciones = opciones.filter(oferta => faltan.includes(oferta.category) && pertinente(oferta));
      }
    }
    // Penalizar el comercio repetido deja subir a otro comercio con puntaje cercano.
    const ajustado = oferta => valor(oferta) - (penalizar && enPrimeras(oferta.merchantId) > 0 ? penalizacionComercio : 0);
    // Las opciones ya están en orden de desempate: ante el mismo valor gana la primera.
    const elegida = opciones.reduce((mejor, oferta) => (ajustado(oferta) > ajustado(mejor) ? oferta : mejor));
    lista.push(elegida);
    restantes.splice(restantes.indexOf(elegida), 1);
  }
  return lista;
}
