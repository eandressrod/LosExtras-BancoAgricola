// H22, fase 2: R = 20·C + 45·M. La intención del día (T) y los multiplicadores llegan como reglas de otras historias.
//
// Los términos son binarios en esta fase: C indica interés declarado en la categoría y M en el comercio.
// Elegir un comercio implica interés en su categoría (C = 1), así que un comercio elegido suma 65 y nunca queda
// por debajo de una oferta que solo coincide en categoría (20). Los pesos viven en config.js, versionados.

/**
 * Componentes del puntaje de una oferta para un perfil.
 * El multiplicador (H23, «Menos de este comercio») afecta a C y M; la intención (H25) se suma aparte.
 * @returns {import('./contrato.js').Componentes}
 */
export function puntuar(oferta, perfil, config, reglas) {
  const { pesos } = config;
  const M = perfil.comercios.has(oferta.merchantId) ? 1 : 0;
  const C = M || perfil.categorias.has(oferta.category) ? 1 : 0;
  const T = reglas.intencion(oferta, config);
  const R = reglas.multiplicador(oferta, perfil) * (pesos.categoria * C + pesos.comercio * M) + pesos.intencion * T;
  return { C, M, T, R };
}

/**
 * Una sola razón: la del término que más aportó a R. Nunca se explica con un término en cero.
 * Con M = 1 la categoría no compite como razón: «Porque elegiste…» ya explica el interés en su categoría.
 * @returns {import('./contrato.js').Razon | null}
 */
export function razonDe(oferta, { C, M, T }, config) {
  const { pesos } = config;
  const aportes = [
    { tipo: 'comercio', aporte: pesos.comercio * M, texto: () => `Porque elegiste ${oferta.merchant}` },
    { tipo: 'categoria', aporte: M ? 0 : pesos.categoria * C, texto: () => `Por tu interés en ${oferta.categoryName ?? oferta.category}` },
    { tipo: 'intencion', aporte: pesos.intencion * T, texto: () => 'Por lo que buscas hoy' }
  ];
  const dominante = aportes.reduce((mejor, termino) => (termino.aporte > mejor.aporte ? termino : mejor));
  return dominante.aporte > 0 ? { tipo: dominante.tipo, texto: dominante.texto() } : null;
}
