// Repositorio Supabase para persistir las preferencias de categorías del usuario (H3).
// Usa upsert sobre preferencias_usuario para que cada usuario tenga exactamente un registro.

/**
 * Inicializa el repositorio de preferencias de usuario vinculado al cliente Supabase.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} cliente
 */
export function crearRepositorioPreferenciasUsuario(cliente) {
  return {
    /**
     * Persiste las categorías seleccionadas y marca la encuesta como completada.
     * Usa upsert para crear o actualizar el registro del propietario de la sesión.
     *
     * @param {string} usuarioId - ID del propietario; proviene del token de sesión, nunca del cliente.
     * @param {string[]} categorias - Categorías validadas por el servicio.
     */
    async guardarPreferencias(usuarioId, categorias) {
      const { error } = await cliente
        .from('preferencias_usuario')
        .upsert({ usuario_id: usuarioId, categorias, encuesta_completada: true });

      if (error) throw new Error('No se pudieron guardar las preferencias. Intenta de nuevo.');
    }
  };
}