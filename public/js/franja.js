// Sistema visual de Promociones: diapositivas de la franja de avisos de Para ti (docs/SISTEMA_PROMOCIONES.md).
// Cuenta lo que la lista no dice por sí sola y nunca repite una tarjeta. Solo usa el catálogo, la tarjeta elegida
// y las señales declaradas: no hay clics, vistas ni analítica. Función pura: la misma entrada da la misma franja.
import { textoVencePronto, diaDeLaSemana } from './promocion-vista.js';

export { diaDeLaSemana };

const MAXIMO = 5;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const PLURAL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const dinero = valor => '$' + (Number.isInteger(valor) ? valor : valor.toFixed(2));
const mayuscula = texto => texto.charAt(0).toUpperCase() + texto.slice(1);
const minuscula = texto => texto.charAt(0).toLowerCase() + texto.slice(1);

/** «Los martes», «De lunes a jueves», «Sábados y domingos». */
export function textoDias(dias) {
  const orden = [...new Set(dias)].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)); // de lunes a domingo
  if (orden.length === 1) return 'Los ' + PLURAL[orden[0]];
  const seguidos = orden.every((dia, i) => i === 0 || dia === (orden[i - 1] + 1) % 7);
  if (seguidos && orden.length > 2) return `De ${DIAS[orden[0]]} a ${DIAS[orden.at(-1)]}`;
  const nombres = orden.map(dia => PLURAL[dia]);
  return mayuscula(nombres.slice(0, -1).join(', ') + ' y ' + nombres.at(-1));
}

// Con orden personalizado, lo que corresponde a los intereses declarados va primero; si nada corresponde, compite todo.
const preferirIntereses = (lista, personal) => (personal && lista.some(p => p.razon) ? lista.filter(p => p.razon) : lista);

function ahorro(promociones, personal) {
  const candidatas = preferirIntereses(promociones.filter(p => p.availableToday && p.discountCap != null), personal);
  const elegida = candidatas.reduce((mejor, p) => (!mejor || p.discountCap > mejor.discountCap ? p : mejor), null);
  if (!elegida) return null;
  const compra = elegida.minimumPurchase != null ? `Compra mínima ${dinero(elegida.minimumPurchase)} · ` : '';
  return {
    tipo: 'ahorro', titulo: `Hoy puedes ahorrar hasta ${dinero(elegida.discountCap)} en ${elegida.merchant}`,
    detalle: compra + elegida.benefit, accion: { tipo: 'promo', id: elegida.id }, logoUrl: elegida.logoUrl
  };
}

function hoyToca(promociones, dia, usada, personal) {
  const [elegida] = preferirIntereses(promociones.filter(p => p.id !== usada && p.availableToday && p.usageDays?.includes(dia)), personal);
  return elegida && {
    tipo: 'hoy-toca', titulo: `Hoy ${DIAS[dia]}: ${elegida.merchant}`, detalle: elegida.benefit,
    accion: { tipo: 'promo', id: elegida.id }, logoUrl: elegida.logoUrl
  };
}

function semana(promociones, dia, personal) {
  const [elegida] = preferirIntereses(promociones.filter(p => p.usageDays?.length && !p.usageDays.includes(dia)), personal);
  return elegida && {
    tipo: 'semana', titulo: `${textoDias(elegida.usageDays)} en ${elegida.merchant}`, detalle: elegida.benefit,
    accion: { tipo: 'detalle', id: elegida.id }, logoUrl: elegida.logoUrl
  };
}

function vence(promociones, hoy) {
  const pronto = promociones.map(p => ({ p, texto: textoVencePronto(p, hoy) })).filter(({ texto }) => texto);
  if (!pronto.length) return null;
  const [{ p, texto }] = pronto;
  return {
    tipo: 'vence', titulo: pronto.length === 1 ? `${p.merchant}: ${minuscula(texto)}` : `${pronto.length} promociones vencen esta semana`,
    detalle: pronto.length === 1 ? p.benefit : 'Aprovéchalas antes de que terminen', accion: { tipo: 'promo', id: p.id }
  };
}

function guardadas(ids) {
  if (!ids.length) return null;
  return {
    tipo: 'guardadas', titulo: ids.length === 1 ? 'Tienes 1 promoción guardada' : `Tienes ${ids.length} promociones guardadas`,
    detalle: 'Encuéntralas cuando las necesites', accion: { tipo: 'ir', destino: '/guardadas.html', etiqueta: 'Ver' }
  };
}

function orden(promociones, estrategia) {
  if (estrategia !== 'personalizada') {
    return {
      tipo: 'orden', titulo: 'Ordenadas por las más recientes', detalle: 'Elige tus intereses y verás primero lo tuyo',
      accion: { tipo: 'ir', destino: '/preferencias.html', etiqueta: 'Personalizar' }
    };
  }
  const nombres = [...new Set(promociones.filter(p => p.razon)
    .map(p => (p.razon.tipo === 'comercio' ? p.merchant : p.categoryName)).filter(Boolean))];
  const detalle = nombres.length > 2 ? `${nombres.slice(0, 2).join(', ')} y más` : nombres.join(' y ');
  return {
    tipo: 'orden', titulo: 'Ordenadas por tus intereses', detalle: detalle || 'Según lo que elegiste',
    accion: { tipo: 'ir', destino: '/preferencias.html', etiqueta: 'Editar' }
  };
}

/**
 * @param {{promociones: object[], hoy: string, estrategia: 'base'|'personalizada', guardadas?: string[], encuestaPendiente?: boolean}} entrada
 * @returns {Array<{tipo: string, titulo: string, detalle: string, accion: object, logoUrl?: string}>} de 0 a 5, en orden de prioridad
 */
export function diapositivasFranja({ promociones, hoy, estrategia, guardadas: ids = [], encuestaPendiente = false }) {
  if (!promociones.length) return [];
  const dia = diaDeLaSemana(hoy);
  const personal = estrategia === 'personalizada';
  const deAhorro = ahorro(promociones, personal);
  const encuesta = encuestaPendiente && {
    tipo: 'encuesta', titulo: 'Personaliza tus promociones', detalle: 'Elige tus intereses en 3 pasos',
    accion: { tipo: 'ir', destino: '/encuesta.html', etiqueta: 'Empezar' }
  };
  return [
    encuesta,
    vence(promociones, hoy),
    deAhorro,
    hoyToca(promociones, dia, deAhorro?.accion.id, personal),
    semana(promociones, dia, personal),
    guardadas(ids),
    !(encuestaPendiente && !personal) && orden(promociones, estrategia)
  ].filter(Boolean).slice(0, MAXIMO);
}
