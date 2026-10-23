// H22: un criterio declarado (canal o beneficio) se muestra como insignia cuando la oferta lo cumple; nunca es la razón.

const TEXTO_CANAL = { presencial: 'En el local', delivery: 'A domicilio', 'en-linea': 'En línea' };
const TEXTO_BENEFICIO = {
  descuento: 'Descuento', '2x1-combo': '2x1 o combos', 'cuotas-sin-intereses': 'Cuotas sin intereses', 'cashback-puntos': 'Cashback o puntos'
};

/**
 * Insignias de los canales declarados que ofrece la oferta y de su tipo de beneficio, si fue declarado.
 * La indiferencia («Me da igual») no produce insignias: perfil.js la excluye de canales y beneficios.
 * @returns {import('./contrato.js').Insignia[]}
 */
export function insigniasDe(oferta, perfil) {
  const canales = (oferta.channels ?? []).filter(canal => perfil.canales.has(canal))
    .map(canal => ({ tipo: 'canal', valor: canal, texto: TEXTO_CANAL[canal] }));
  const beneficio = perfil.beneficios.has(oferta.benefitType)
    ? [{ tipo: 'beneficio', valor: oferta.benefitType, texto: TEXTO_BENEFICIO[oferta.benefitType] }]
    : [];
  return [...canales, ...beneficio].filter(insignia => insignia.texto);
}
