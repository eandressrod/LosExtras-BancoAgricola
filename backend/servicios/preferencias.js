// Lógica de negocio para guardar las categorías de interés del usuario (H3).
// Aplica las reglas de validación antes de delegar la persistencia al repositorio.
const CATEGORIAS_PERMITIDAS = new Set(['Restaurantes', 'Compras', 'Entretenimiento']);

/**
 * Valida y persiste las categorías de interés del usuario.
 *
 * @param {string} usuarioId - ID del propietario de la sesión (viene siempre del token, nunca del cliente).
 * @param {string[]} categorias - Categorías seleccionadas por el usuario.
 * @param {{ guardarPreferencias(usuarioId: string, categorias: string[]): Promise<void> }} repo
 * @throws {Error} Si la selección está vacía, es nula o contiene categorías inválidas.
 */
export async function validarYGuardarPreferencias(usuarioId, categorias, repo) {
  if (!Array.isArray(categorias) || categorias.length === 0) {
    throw new Error('Selecciona al menos una categoría');
  }

  const hayInvalida = categorias.some((c) => !CATEGORIAS_PERMITIDAS.has(c));
  if (hayInvalida) {
    throw new Error('Categoría inválida');
  }

  await repo.guardarPreferencias(usuarioId, categorias);
}

