// H23: acciones de corrección de una tarjeta de Para ti (hoja «Opciones»). Funciones puras: qué ofrecer y qué confirmar.
// Una acción activa se marca (aria-pressed) y volver a pulsarla la deshace en la misma tarjeta.
import { estadoCorrecciones } from './motor/correcciones.js';

const senal = (clase, ambito, valor) => ({ clase, ambito, valor, origen: 'tarjeta' });

/** Las cuatro correcciones de la oferta con su señal y, si está activa, el id para deshacerla. */
export function accionesDeOferta(oferta, senales = []) {
  const estado = estadoCorrecciones(oferta, senales);
  const categoria = oferta.categoryName || oferta.category;
  return [
    { tipo: 'noMeInteresa', texto: 'No me interesa esta promo', senal: senal('rechazo', 'oferta', oferta.id) },
    { tipo: 'mas', texto: 'Más de este comercio', senal: senal('interes', 'comercio', oferta.merchantId) },
    { tipo: 'menos', texto: 'Menos de este comercio', senal: senal('rechazo', 'comercio', oferta.merchantId) },
    { tipo: 'categoria', texto: `No mostrar ${categoria}`, senal: senal('rechazo', 'categoria', oferta.category) }
  ].map(accion => ({ ...accion, activa: estado[accion.tipo] !== null, senalId: estado[accion.tipo] }));
}

/** Texto del aviso tras aplicar una corrección o deshacerla ('deshacer'). */
export function textoConfirmacion(tipo, oferta) {
  return {
    noMeInteresa: 'No verás esta promoción en Para ti.',
    mas: `Verás más de ${oferta.merchant}.`,
    menos: `Verás menos de ${oferta.merchant}.`,
    categoria: `No verás ${oferta.categoryName || oferta.category} en Para ti.`,
    deshacer: 'Se deshizo tu cambio.'
  }[tipo];
}
