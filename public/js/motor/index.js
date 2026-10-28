// H22: motor de Para ti, fases 1–2 (ADR-004 y ADR-009). Función pura: misma entrada, mismo orden.
// Corre en el backend (/api/para-ti) y, sin cambios, en el cliente para la vista previa de H21.
//
// Recorrido de ordenarParaTi, en este orden:
//   1. Elegibilidad (elegibilidad.js): fuera lo que la tarjeta no puede usar; cada descarte guarda su motivo.
//   2. Perfil (perfil.js): se deriva de las señales activas en cada llamada; no se guarda.
//   3. Alcance (alcance.js) y filtros explícitos (filtros.js): qué ofertas compiten. Las reglas externas pueden excluir.
//   4. Estrategia: 'base' sin intereses declarados ni intención del día (H25); 'personalizada' con puntaje (puntaje.js).
//   5. Armado (orden.js): posición por posición, con variedad por comercio y cobertura de categorías.
//   6. Explicación: una razón (término dominante) y las insignias de los criterios declarados (insignias.js).
//
// El motor no lee el reloj ni el almacenamiento: la vigencia ya viene calculada en cada oferta (canUse, availableToday).
import { CONFIGURACION } from './config.js';
import { separarOrdenables } from './elegibilidad.js';
import { perfilDeSenales } from './perfil.js';
import { enAlcance } from './alcance.js';
import { aplicarFiltros, hayFiltros } from './filtros.js';
import { puntuar, razonDe } from './puntaje.js';
import { insigniasDe } from './insignias.js';
import { armarLista } from './orden.js';

export {
  CHIPS_HOY_BUSCO,
  normalizarIntencion,
  leerIntencionTemporal,
  calcularTerminoIntencion,
  reglaIntencion,
  textoPrimeroHoyBusco
} from './intencion.js';

/**
 * Reglas que no cambian nada. H23 (rechazos) y H25 («Hoy busco») reemplazan solo la que necesitan.
 * @type {import('./contrato.js').ReglasExternas}
 */
export const REGLAS_NEUTRAS = Object.freeze({ excluir: () => false, multiplicador: () => 1, intencion: () => 0 });

// La estrategia base no puntúa: todas sus ofertas llevan componentes en cero y ninguna razón.
const SIN_PUNTAJE = Object.freeze({ C: 0, M: 0, T: 0, R: 0 });

/**
 * @param {object} entrada
 * @param {object[]} entrada.ofertas Ofertas aplanadas para la tarjeta elegida, sin filtrar por intereses.
 * @param {import('./contrato.js').Senal[]} [entrada.senales]
 * @param {import('./contrato.js').FiltrosExplicitos} [entrada.filtros]
 * @param {Partial<import('./contrato.js').ReglasExternas>} [entrada.reglas]
 * @param {'intereses' | 'todo'} [entrada.alcance] 'todo' (sección Explorar): no recorta por intereses; el puntaje sigue ordenando.
 * @returns {import('./contrato.js').RespuestaParaTi}
 */
export function ordenarParaTi({ ofertas = [], senales = [], filtros = {}, config = CONFIGURACION, reglas = {}, alcance = 'intereses' } = {}) {
  const aplicadas = { ...REGLAS_NEUTRAS, ...reglas };

  // 1. Elegibilidad. Sin nada ordenable para la tarjeta no hay estrategia que aplicar.
  const { ordenables, descartadas } = separarOrdenables(ofertas);
  const responder = (estrategia, promociones, vacio) => ({ version: config.version, estrategia, vacio, promociones, descartadas });
  if (!ordenables.length) return responder('base', [], 'sin-catalogo');

  // 2–3. Perfil, alcance y filtros. Distinguir el motivo del vacío permite a la pantalla ofrecer la salida correcta:
  // quitar filtros ('filtros') o revisar intereses ('intereses').
  const perfil = perfilDeSenales(senales);
  const enJuego = alcance === 'todo' ? ordenables : enAlcance(ordenables, perfil, filtros.categoria);
  const candidatas = aplicarFiltros(enJuego, filtros)
    .filter(oferta => !aplicadas.excluir(oferta, perfil));
  const vacio = candidatas.length ? null : hayFiltros(filtros) ? 'filtros' : 'intereses';
  const hayIntencion = aplicadas.intencion !== REGLAS_NEUTRAS.intencion
    && candidatas.some(oferta => aplicadas.intencion(oferta, config) > 0);

  // 4a. Estrategia base: no lee comercios elegidos ni criterios; es la referencia de comparación.
  // Ordena por alta más reciente y solo aplica el límite por comercio (sin penalización ni cobertura).
  if (perfil.sinIntereses && !hayIntencion) {
    const lista = armarLista(candidatas, { penalizar: false, config });
    return responder('base', lista.map(oferta => ({ ...oferta, componentes: { ...SIN_PUNTAJE }, razon: null, insignias: [] })), vacio);
  }

  // 4b–5. Estrategia personalizada: se puntúa una vez cada candidata y el armado consulta ese puntaje.
  // Solo una oferta de interés declarado (C = 1) o con intención activa (T > 0) cuenta como alternativa pertinente.
  const componentes = new Map(candidatas.map(oferta => [oferta.id, puntuar(oferta, perfil, config, aplicadas)]));
  const de = oferta => componentes.get(oferta.id);
  const lista = armarLista(candidatas, {
    valor: oferta => de(oferta).R,
    pertinente: oferta => de(oferta).C === 1 || de(oferta).T > 0,
    categoriasCubrir: [...perfil.categorias],
    penalizar: !perfil.sinIntereses,
    config
  });
  // 6. Cada oferta sale con sus componentes, su razón (o null) y sus insignias, en el orden armado.
  return responder('personalizada', lista.map(oferta => ({
    ...oferta, componentes: de(oferta), razon: razonDe(oferta, de(oferta), config), insignias: insigniasDe(oferta, perfil)
  })), vacio);
}
