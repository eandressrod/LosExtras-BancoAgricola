// H23 (SCRUM-117): correcciones desde una tarjeta de Para ti. Funciones puras sobre las señales de H22.
// Se conectan al motor como ReglasExternas (contrato.js); el handler de /api/senales usa efectosDeDeclarar.
//
//   «No me interesa esta promo»  rechazo·oferta      sale de Para ti; con filtros o búsqueda sigue apareciendo
//   «Más de este comercio»       interés·comercio    M = 1 (lo resuelve puntaje.js); retira su «Menos»
//   «Menos de este comercio»     rechazo·comercio    si estaba elegido, solo pierde M; si no, R × factorMenos
//   Excluir categoría            rechazo·categoría   sale de Para ti; un filtro explícito por ella la muestra
import { CONFIGURACION } from './config.js';
import { hayFiltros } from './filtros.js';

export const PREGUNTA_EXCLUIR_CATEGORIA = 'excluir-categoria';

const DIA_MS = 24 * 60 * 60 * 1000;
const activa = senal => senal.activa !== false;
const es = (clase, ambito, valor) => senal => activa(senal) && senal.clase === clase && senal.ambito === ambito && senal.valor === valor;

/**
 * Reglas del motor para una consulta: los filtros explícitos deciden si un rechazo se aplica.
 * @param {import('./contrato.js').FiltrosExplicitos} [filtros]
 * @returns {Pick<import('./contrato.js').ReglasExternas, 'excluir' | 'multiplicador'>}
 */
export function reglasCorrecciones(filtros = {}, config = CONFIGURACION) {
  const conFiltros = hayFiltros(filtros);
  return {
    excluir: (oferta, { rechazos }) =>
      (rechazos.ofertas.has(oferta.id) && !conFiltros)
      || (rechazos.categorias.has(oferta.category) && filtros.categoria !== oferta.category),
    multiplicador: (oferta, { rechazos }) =>
      rechazos.comercios.has(oferta.merchantId) && !rechazos.eleccionesQuitadas.has(oferta.merchantId)
        ? config.correcciones.factorMenos : 1
  };
}

/**
 * Efectos de declarar una señal sobre las activas del mismo dueño:
 * «Menos» de un comercio elegido desactiva su interés (y lo anota con quitoEleccion); «Más» retira su «Menos».
 * @returns {{ desactivar: number[], quitoEleccion: boolean }}
 */
export function efectosDeDeclarar({ clase, ambito, valor }, activas = []) {
  if (ambito !== 'comercio') return { desactivar: [], quitoEleccion: false };
  const opuesta = clase === 'rechazo' ? 'interes' : 'rechazo';
  const desactivar = activas.filter(es(opuesta, 'comercio', valor)).map(senal => senal.id);
  return { desactivar, quitoEleccion: clase === 'rechazo' && desactivar.length > 0 };
}

/** Id de la señal activa de cada corrección de una oferta (para marcarla y deshacerla), o null. */
export function estadoCorrecciones(oferta, senales = []) {
  const id = (clase, ambito, valor) => senales.find(es(clase, ambito, valor))?.id ?? null;
  return {
    noMeInteresa: id('rechazo', 'oferta', oferta.id),
    mas: id('interes', 'comercio', oferta.merchantId),
    menos: id('rechazo', 'comercio', oferta.merchantId),
    categoria: id('rechazo', 'categoria', oferta.category)
  };
}

/**
 * Categoría por la que preguntar «¿Dejamos de mostrarte {categoría}?», o null.
 * Requiere «Menos» activos en menosParaPreguntar comercios distintos de la categoría; nunca si ya está excluida
 * ni antes de diasSinRepetirPregunta desde que se respondió «no». «Una vez por visita» lo controla la pantalla.
 * @param {Map<string, string>} categoriaDeComercio comercio → categoría, del catálogo vigente
 * @param {Array<{pregunta: string, valor: string, respuesta: 'si'|'no', respondidaEn: string}>} respuestas
 */
export function preguntaPendiente(senales, categoriaDeComercio, respuestas = [], ahora = new Date(), config = CONFIGURACION) {
  const { menosParaPreguntar, diasSinRepetirPregunta } = config.correcciones;
  const vivas = senales.filter(activa);
  const excluidas = new Set(vivas.filter(s => s.clase === 'rechazo' && s.ambito === 'categoria').map(s => s.valor));
  const rechazadaHace = categoria => respuestas.some(r => r.pregunta === PREGUNTA_EXCLUIR_CATEGORIA && r.valor === categoria
    && r.respuesta === 'no' && ahora.getTime() - new Date(r.respondidaEn).getTime() < diasSinRepetirPregunta * DIA_MS);
  const comercios = new Map();
  for (const senal of vivas) {
    if (senal.clase !== 'rechazo' || senal.ambito !== 'comercio') continue;
    const categoria = categoriaDeComercio.get(senal.valor);
    if (categoria) comercios.set(categoria, (comercios.get(categoria) ?? new Set()).add(senal.valor));
  }
  for (const [categoria, menos] of comercios) {
    if (menos.size >= menosParaPreguntar && !excluidas.has(categoria) && !rechazadaHace(categoria)) return categoria;
  }
  return null;
}
