// Reglas de H11. El usuario siempre llega desde la sesión, no desde el formulario.

export async function guardarPromocion(usuarioId, promocionId, repo, existe) {
  if (typeof promocionId !== 'string' || promocionId.trim() === '') {
    throw new Error('Falta el identificador de la promoción.');
  }
  const id = promocionId.trim();
  if (existe && !(await existe(id))) {
    throw new Error('Promoción no encontrada.');
  }
  await repo.guardar(usuarioId, id);
  return { guardada: true };
}

export async function quitarPromocion(usuarioId, promocionId, repo) {
  if (typeof promocionId !== 'string' || promocionId.trim() === '') {
    throw new Error('Falta el identificador de la promoción.');
  }
  await repo.quitar(usuarioId, promocionId.trim());
  return { guardada: false };
}

// Las vencidas o de otra tarjeta siguen en ids, pero no salen en la lista usable.
export function seleccionarGuardadasVisibles(filtradas, idsGuardados) {
  const ids = [];
  const promociones = [];
  for (const id of idsGuardados || []) {
    if (ids.includes(id)) continue;
    ids.push(id);
    const promo = (filtradas || []).find(item => item.id === id && item.canUse === true);
    if (promo) promociones.push(promo);
  }
  return {
    ids,
    promociones,
    sinCoincidencias: ids.length > 0 && promociones.length === 0
  };
}
