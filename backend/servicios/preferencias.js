// Lógica de negocio para guardar las categorías de interés del usuario (H3).
// Aplica las reglas de validación antes de delegar la persistencia al repositorio.
export const CATEGORIAS_PERMITIDAS = new Set(['Restaurantes', 'Compras', 'Entretenimiento']);

/**
 * Valida y persiste las categorías de interés del usuario.
 *
 * @param {string} usuarioId - ID del propietario de la sesión (viene siempre del token, nunca del cliente).
 * @param {string[]} categorias - Categorías seleccionadas por el usuario.
 * @param {{ guardarPreferencias(usuarioId: string, categorias: string[]): Promise<void> }} repo
 * @param {Pick<import('../repositorios/contrato.js').RepositorioSenales, 'sincronizarCategorias'>} [senales]
 *   H22: el motor lee las categorías del registro de señales; preferencias_usuario se sigue escribiendo para la versión de regreso.
 * @throws {Error} Si la selección está vacía, es nula o contiene categorías inválidas.
 */
export async function validarYGuardarPreferencias(usuarioId, categorias, repo, senales) {
  if (!Array.isArray(categorias) || categorias.length === 0) {
    throw new Error('Selecciona al menos una categoría');
  }

  const permitidas = repo.obtenerCategorias ? new Set((await repo.obtenerCategorias()).map(c => c.id)) : CATEGORIAS_PERMITIDAS;
  const hayInvalida = categorias.some((c) => !permitidas.has(c));
  if (hayInvalida) {
    throw new Error('Categoría inválida');
  }

  await repo.guardarPreferencias(usuarioId, categorias);
  await senales?.sincronizarCategorias(usuarioId, categorias, 'encuesta');
}

