// H22 (SCRUM-128): datos de prueba del motor sobre el catálogo del esqueleto de H24.
// Las ofertas salen de la fuente única con el mismo aplanado que la API; las señales siguen el contrato de public/js/motor/contrato.js.
import fuente from '../../../catalogo/catalogo.json' with { type: 'json' };
import { promocionesDeFuente } from '../../../backend/catalogo.js';
import { filtrarPromociones } from '../../../backend/promociones.js';

/** Martes 21 de octubre de 2026 al mediodía en El Salvador. */
export const AHORA = new Date('2026-10-21T18:00:00Z');

/** Ofertas que aplican a la tarjeta, sin filtrar por intereses, como las recibe el motor. */
export function ofertasDelCatalogo(tipoTarjeta = 'basica', ahora = AHORA) {
  return filtrarPromociones(promocionesDeFuente(fuente), tipoTarjeta, [], ahora);
}

let siguiente = 1;
const senal = (clase, ambito, valor, extra = {}) =>
  ({ id: siguiente++, clase, ambito, valor, origen: 'encuesta', creadaEn: '2026-10-21T17:00:00.000Z', activa: true, ...extra });

export const PERFILES = {
  vacio: [],
  soloCategorias: [
    senal('interes', 'categoria', 'Restaurantes'),
    senal('interes', 'categoria', 'Tecnología')
  ],
  conComercios: [
    senal('interes', 'categoria', 'Restaurantes'),
    senal('interes', 'comercio', 'pizza-hut'),
    senal('interes', 'comercio', 'cine'),
    senal('criterio', 'canal', 'delivery'),
    senal('criterio', 'beneficio', '2x1-combo'),
    senal('criterio', 'descubrir', 'mezcla')
  ],
  conRechazos: [
    senal('interes', 'categoria', 'Restaurantes'),
    senal('interes', 'categoria', 'Tecnología'),
    senal('rechazo', 'oferta', 'starbucks-regalo', { origen: 'tarjeta' }),
    senal('rechazo', 'comercio', 'claro', { origen: 'tarjeta' }),
    senal('interes', 'categoria', 'Compras', { activa: false })
  ]
};
