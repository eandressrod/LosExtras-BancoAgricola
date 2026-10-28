// H22, fase 1: la elegibilidad filtra antes de puntuar. Lo que la tarjeta no puede usar nunca entra.
// Ningún puntaje, regla ni preferencia puede devolver al listado una oferta descartada aquí (CDA 1 de H22).
// Los motivos viajan en la respuesta (descartadas) para revisar por qué una oferta no aparece.

/**
 * Motivo por el que la oferta no se puede ordenar, o null si es ordenable.
 * Recibe la oferta ya aplanada para la tarjeta elegida (filtrarPromociones del backend).
 */
export function motivoNoOrdenable(oferta) {
  // De la comprobación más general a la más concreta; se informa solo el primer motivo.
  if (!oferta.benefit || !oferta.applicableCard) return 'sin-beneficio';
  if (!oferta.canUse) return 'fuera-de-vigencia';
  // null = todos los días; una lista vacía o ausente no define cuándo se puede usar.
  if (oferta.usageDays !== null && !(Array.isArray(oferta.usageDays) && oferta.usageDays.length)) return 'sin-dias';
  if (!Array.isArray(oferta.channels) || !oferta.channels.length) return 'sin-canal';
  return null;
}

/** Separa las ordenables, en el orden recibido, de las descartadas con su motivo. */
export function separarOrdenables(ofertas = []) {
  const ordenables = [];
  const descartadas = [];
  for (const oferta of ofertas ?? []) {
    const motivo = motivoNoOrdenable(oferta);
    if (motivo) descartadas.push({ id: oferta.id, motivo });
    else ordenables.push(oferta);
  }
  return { ordenables, descartadas };
}

// SCRUM-133: sin ?tarjeta= se evalúan todas las tarjetas propias y la oferta muestra el mejor beneficio entre ellas.
// Regla determinista, en este orden:
//   1. Solo compiten las tarjetas propias con beneficio en la oferta (una exclusiva Black exige una Black propia).
//   2. Mayor valor: el porcentaje de descuento o reintegro, o el número de cuotas (valorBeneficio).
//   3. Empate: Black antes que Básica; en el catálogo su beneficio es el de Básica con algo más (2×1 y bebida incluida).
//   4. Empate entre tarjetas del mismo tipo: la predeterminada del perfil.
//   5. Último desempate: el id de tarjeta menor.

const PRIORIDAD_TIPO = { black: 0, basica: 1 };

/** Porcentaje del texto del beneficio («20 % de descuento») o número de cuotas («12 cuotas»); 0 si no tiene. */
export function valorBeneficio(texto) {
  const porcentaje = /(\d+(?:[.,]\d+)?)\s*%/.exec(texto ?? '');
  if (porcentaje) return Number(porcentaje[1].replace(',', '.'));
  const cuotas = /(\d+)\s*cuotas/i.exec(texto ?? '');
  return cuotas ? Number(cuotas[1]) : 0;
}

/**
 * Ordena del mejor al peor los beneficios de las tarjetas propias que aplican a una oferta. No altera la entrada.
 * @param {Array<import('./contrato.js').BeneficioPropio>} candidatos
 * @param {string | null} predeterminadaId
 */
export function ordenarBeneficios(candidatos, predeterminadaId) {
  const prioridad = tipo => PRIORIDAD_TIPO[tipo] ?? 2;
  return [...candidatos].sort((a, b) =>
    valorBeneficio(b.texto) - valorBeneficio(a.texto)
    || prioridad(a.tipoTarjeta) - prioridad(b.tipoTarjeta)
    || Number(b.tarjetaId === predeterminadaId) - Number(a.tarjetaId === predeterminadaId)
    || (a.tarjetaId < b.tarjetaId ? -1 : a.tarjetaId > b.tarjetaId ? 1 : 0));
}
