// H16: las tarjetas propias son las cuentas de tipo tarjeta del dueño de la sesión.
// Su segmento (Básica / Black) define qué beneficios aplican; los saldos no salen de aquí.
const TIPO_POR_SEGMENTO = { 'Básica': 'basica', 'Black': 'black' };

/** Tarjetas del usuario, en el orden de sus cuentas, con tipo de beneficio y referencia enmascarada. */
export function tarjetasPropias(cuentas) {
  return cuentas
    .filter(cuenta => /tarjeta/i.test(cuenta.tipo) && TIPO_POR_SEGMENTO[cuenta.segmento])
    .map(cuenta => ({
      id: cuenta.id,
      tipoTarjeta: TIPO_POR_SEGMENTO[cuenta.segmento],
      nombre: cuenta.nombre,
      numeroEnmascarado: cuenta.numeroEnmascarado
    }));
}

/**
 * Tarjeta con la que se consultan beneficios. Sin `?tarjeta` se usa la del perfil (o la primera propia).
 * Solo se acepta un identificador de las tarjetas del propio usuario.
 * @param {ReturnType<typeof tarjetasPropias>} tarjetas
 * @param {URLSearchParams} parametros
 * @param {'basica' | 'black'} tipoDelPerfil
 * @returns {{ ok: true, tarjeta: object | null } | { ok: false, motivo: 'ajena' | 'invalida' }}
 */
export function elegirTarjeta(tarjetas, parametros, tipoDelPerfil) {
  const valores = parametros.getAll('tarjeta');
  if (valores.length === 0) {
    return { ok: true, tarjeta: tarjetas.find(tarjeta => tarjeta.tipoTarjeta === tipoDelPerfil) ?? tarjetas[0] ?? null };
  }
  if (valores.length > 1 || !valores[0]) return { ok: false, motivo: 'invalida' };
  const tarjeta = tarjetas.find(item => item.id === valores[0]);
  return tarjeta ? { ok: true, tarjeta } : { ok: false, motivo: 'ajena' };
}

/** Respuesta HTTP para una elección rechazada: un ID ajeno se trata igual que uno inexistente. */
export function rechazoDeTarjeta(eleccion) {
  return eleccion.motivo === 'ajena'
    ? { cuerpo: { error: 'Tarjeta no encontrada.' }, estado: 404 }
    : { cuerpo: { error: 'Tarjeta no válida.' }, estado: 400 };
}
