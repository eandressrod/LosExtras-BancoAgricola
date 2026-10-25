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
