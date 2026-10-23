// H21: lógica pura de la encuesta en tres páginas (ADR-010). Sin DOM ni red: la usa encuesta-hoja.js y la prueban las unitarias.
//
// Página 1 elige categorías, página 2 afina hasta 3 de ellas con comercios o subcategorías, página 3 pide criterios.
// Cada página se confirma por separado: solo entonces sus elecciones se convierten en señales con origen encuesta.

const MAXIMO_CATEGORIAS = 8;
const MAXIMO_AFINAR = 3;
const MAXIMO_OPCIONES = 6;
const MAXIMO_BENEFICIOS = 2;
const NINGUNO = 'ninguno';
const INDIFERENTE = 'indiferente';
const PREFIJO_OMITIDA = 'los-extras-encuesta-omitida:';

const aplicables = ofertas => (ofertas ?? []).filter(oferta => oferta.canUse);
const contarPor = (ofertas, clave) => ofertas.reduce((cuenta, oferta) => cuenta.set(clave(oferta), (cuenta.get(clave(oferta)) ?? 0) + 1), new Map());
const normalizar = texto => String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Página 1: las categorías con más promociones aplicables a la tarjeta; empates en el orden del catálogo. */
export function opcionesIntereses(ofertas, categorias, maximo = MAXIMO_CATEGORIAS) {
  const totales = contarPor(aplicables(ofertas), oferta => oferta.category);
  return (categorias ?? [])
    .filter(categoria => totales.get(categoria.id))
    .sort((a, b) => totales.get(b.id) - totales.get(a.id) || (a.orden ?? 0) - (b.orden ?? 0))
    .slice(0, maximo)
    .map(categoria => ({ id: categoria.id, nombre: categoria.nombre, icono: categoria.icono_url ?? null, total: totales.get(categoria.id) }));
}

/**
 * Opción de afinado que representa a una oferta, o null si su comercio no se afina.
 * En una categoría sensible se pregunta por subcategoría, nunca por marca.
 */
function opcionDe(oferta, sensible) {
  if (sensible || oferta.refineBy === 'subcategoria') {
    return oferta.subcategoryId ? { id: oferta.subcategoryId, nombre: oferta.subcategoryName, ambito: 'subcategoria' } : null;
  }
  if (oferta.refineBy === 'no' || !oferta.merchantId) return null;
  return { id: oferta.merchantId, nombre: oferta.merchant, imagen: oferta.logoUrl ?? null, ambito: 'comercio',
    reconocible: Boolean(oferta.recognizable), precio: oferta.priceLevel ?? null, subcategoria: oferta.subcategoryId ?? null };
}

function candidatasDe(categoriaId, ofertas) {
  const propias = aplicables(ofertas).filter(oferta => oferta.category === categoriaId);
  const sensible = propias.some(oferta => oferta.sensitive);
  const candidatas = new Map();
  for (const oferta of propias) {
    const opcion = opcionDe(oferta, sensible);
    if (opcion && !candidatas.has(`${opcion.ambito}:${opcion.id}`)) candidatas.set(`${opcion.ambito}:${opcion.id}`, opcion);
  }
  return { modo: sensible ? 'subcategoria' : 'comercio', candidatas: [...candidatas.values()] };
}

/** Página 2: hasta 3 categorías elegidas que se pueden afinar, de más a menos promociones; los empates conservan el orden elegido. */
export function categoriasAfinar(elegidas, ofertas, maximo = MAXIMO_AFINAR) {
  const totales = contarPor(aplicables(ofertas), oferta => oferta.category);
  return (elegidas ?? [])
    .filter(id => candidatasDe(id, ofertas).candidatas.length)
    .map((id, posicion) => ({ id, posicion }))
    .sort((a, b) => (totales.get(b.id) ?? 0) - (totales.get(a.id) ?? 0) || a.posicion - b.posicion)
    .slice(0, maximo)
    .map(({ id }) => id);
}

// Puntaje de selección del documento de la encuesta: 0.5·reconocible + 0.25·(1 − similitud) + 0.25·(diferencia de precio / 2).
// La similitud es 1 si comparte subcategoría con una opción ya elegida; la diferencia de precio es la menor respecto a las elegidas.
function puntajeSeleccion(opcion, elegidas) {
  if (opcion.ambito !== 'comercio') return 0;
  const similitud = elegidas.some(otra => otra.subcategoria && otra.subcategoria === opcion.subcategoria) ? 1 : 0;
  const precios = elegidas.map(otra => otra.precio).filter(precio => precio != null);
  const diferencia = opcion.precio == null || !precios.length ? 0 : Math.min(...precios.map(precio => Math.abs(precio - opcion.precio)));
  return 0.5 * (opcion.reconocible ? 1 : 0) + 0.25 * (1 - similitud) + 0.25 * (diferencia / 2);
}

/**
 * Página 2 de una categoría: hasta 6 opciones elegidas una a una con el puntaje de selección.
 * Los empates y el orden de presentación se sortean con la semilla de la persona, así que no cambian durante la sesión.
 * @returns {{modo: 'comercio' | 'subcategoria', opciones: Array<{id: string, nombre: string, ambito: string, imagen?: string | null}>}}
 */
export function opcionesAfinar(categoriaId, ofertas, semilla, maximo = MAXIMO_OPCIONES) {
  const { modo, candidatas } = candidatasDe(categoriaId, ofertas);
  const pendientes = ordenSorteado(candidatas, `${semilla}:${categoriaId}`);
  const elegidas = [];
  while (elegidas.length < maximo && pendientes.length) {
    let mejor = 0;
    for (let i = 1; i < pendientes.length; i += 1) {
      if (puntajeSeleccion(pendientes[i], elegidas) > puntajeSeleccion(pendientes[mejor], elegidas)) mejor = i;
    }
    elegidas.push(...pendientes.splice(mejor, 1));
  }
  const opciones = ordenSorteado(elegidas, `${semilla}:${categoriaId}:orden`)
    .map(({ id, nombre, ambito, imagen }) => (ambito === 'comercio' ? { id, nombre, imagen, ambito } : { id, nombre, ambito }));
  return { modo, opciones };
}

/** Barajado determinista (FNV-1a + mulberry32): la misma semilla da siempre el mismo orden. */
export function ordenSorteado(lista, semilla) {
  let hash = 2166136261;
  for (const caracter of String(semilla)) hash = Math.imul(hash ^ caracter.codePointAt(0), 16777619);
  const azar = () => {
    hash = (hash + 0x6D2B79F5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i -= 1) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Ninguna opción marcada de antemano. */
export function seleccionVacia() {
  return { categorias: [], afinar: {}, canal: null, beneficio: [], descubrir: null };
}

const alternarEn = (lista, valor) => (lista.includes(valor) ? lista.filter(item => item !== valor) : [...lista, valor]);

/**
 * Reglas de selección. Categorías y afinado admiten varias opciones («Ninguno de estos» es exclusiva);
 * canal y descubrir, una; beneficio, hasta 2 con «Me da igual» exclusiva. Devuelve una selección nueva.
 * @param {'categorias' | 'afinar' | 'canal' | 'beneficio' | 'descubrir'} fila
 * @param {string} [categoria] categoría que se afina, solo con fila 'afinar'
 */
export function alternar(seleccion, fila, valor, categoria) {
  if (fila === 'categorias') return { ...seleccion, categorias: alternarEn(seleccion.categorias, valor) };
  if (fila === 'afinar') {
    const actual = seleccion.afinar[categoria] ?? [];
    const exclusiva = valor === NINGUNO || actual.includes(NINGUNO);
    const nueva = exclusiva && !actual.includes(valor) ? [valor] : alternarEn(actual, valor);
    return { ...seleccion, afinar: { ...seleccion.afinar, [categoria]: nueva } };
  }
  if (fila === 'beneficio') {
    const actual = seleccion.beneficio;
    if (actual.includes(valor)) return { ...seleccion, beneficio: actual.filter(item => item !== valor) };
    if (valor === INDIFERENTE) return { ...seleccion, beneficio: [INDIFERENTE] };
    const sinIndiferencia = actual.filter(item => item !== INDIFERENTE);
    return { ...seleccion, beneficio: sinIndiferencia.length < MAXIMO_BENEFICIOS ? [...sinIndiferencia, valor] : sinIndiferencia };
  }
  return { ...seleccion, [fila]: seleccion[fila] === valor ? null : valor };
}

/** El botón principal siempre está habilitado; su texto dice qué pasará. */
export function textoBotonPrincipal(pagina, haySeleccion) {
  if (pagina === 3) return 'Listo';
  return haySeleccion ? 'Siguiente' : 'Saltar este paso';
}

const senal = (clase, ambito, valor) => ({ clase, ambito, valor, origen: 'encuesta' });

/** Señales que confirma una página; en la página 2, las de la categoría indicada. «Ninguno de estos» no escribe nada. */
export function senalesDePagina(pagina, seleccion, categoria) {
  if (pagina === 1) return seleccion.categorias.map(id => senal('interes', 'categoria', id));
  if (pagina === 2) {
    return (seleccion.afinar[categoria] ?? []).filter(clave => clave !== NINGUNO).map(clave => {
      const separador = clave.indexOf(':');
      return senal('interes', clave.slice(0, separador), clave.slice(separador + 1));
    });
  }
  return [
    ...(seleccion.canal ? [senal('criterio', 'canal', seleccion.canal)] : []),
    ...seleccion.beneficio.map(valor => senal('criterio', 'beneficio', valor)),
    ...(seleccion.descubrir ? [senal('criterio', 'descubrir', seleccion.descubrir)] : [])
  ];
}

const misma = (a, b) => a.clase === b.clase && a.ambito === b.ambito && a.valor === b.valor;

/**
 * Qué escribir al confirmar una página: activar lo elegido que no está activo y desactivar,
 * dentro del alcance de esa página, lo que dejó de elegirse. Lo de otras páginas no se toca.
 * @param {Array<{id: number}>} activas señales activas del registro
 * @param {(senal: object) => boolean} enAlcance
 */
export function cambiosSenales(activas, deseadas, enAlcance) {
  return {
    activar: deseadas.filter(nueva => !activas.some(activa => misma(activa, nueva))),
    desactivar: activas.filter(activa => enAlcance(activa) && !deseadas.some(nueva => misma(activa, nueva))).map(activa => activa.id)
  };
}

/** Buscador de la hoja: por nombre o por nombre de subcategoría, sin distinguir mayúsculas ni tildes. */
export function buscarOpciones(opciones, texto) {
  const consulta = normalizar(texto);
  if (!consulta) return [];
  return (opciones ?? []).filter(opcion => [opcion.nombre, ...(opcion.subcategorias ?? []).map(sub => sub.nombre)]
    .some(nombre => normalizar(nombre).includes(consulta)));
}

/** El contador cuenta promociones aplicables, nunca ahorros. */
export function textoContador(total) {
  if (!total) return 'No hay promociones para lo que elegiste.';
  return total === 1 ? '1 promoción para ti' : `${total} promociones para ti`;
}

/** Texto de la región en vivo; vacío si lo primero que se ve no cambió. */
export function anuncioVistaPrevia(antes, despues) {
  if (!despues.length) return textoContador(0);
  if (antes[0]?.id === despues[0].id) return '';
  return `Ahora ves primero promociones de ${despues[0].categoryName}`;
}

// «Omitir» evita que la hoja vuelva a abrirse en la misma sesión (transición del ADR-010 hasta la persistencia de la parte 2).
export function encuestaOmitida(almacen, perfilId) {
  try { return almacen?.getItem(PREFIJO_OMITIDA + perfilId) === '1'; } catch { return false; }
}

export function marcarEncuestaOmitida(almacen, perfilId) {
  try { almacen?.setItem(PREFIJO_OMITIDA + perfilId, '1'); } catch { /* Sin almacenamiento la hoja puede volver a abrirse. */ }
}

/** Al iniciar o cerrar sesión se olvidan las omisiones de cualquier perfil. */
export function olvidarEncuestasOmitidas(almacen) {
  try {
    for (let indice = almacen.length - 1; indice >= 0; indice -= 1) {
      const nombre = almacen.key(indice);
      if (nombre?.startsWith(PREFIJO_OMITIDA)) almacen.removeItem(nombre);
    }
  } catch { /* Sin almacenamiento no hay omisiones que borrar. */ }
}
