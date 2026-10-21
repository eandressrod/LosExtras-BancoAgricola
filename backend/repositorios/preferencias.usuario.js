// Repositorio Supabase para persistir las preferencias de categorías del usuario (H3).
// Usa upsert sobre preferencias_usuario para que cada usuario tenga exactamente un registro.

/**
 * Inicializa el repositorio de preferencias de usuario vinculado al cliente Supabase.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} cliente
 */
export function crearRepositorioPreferenciasUsuario(cliente) {
  return {
    async obtenerCategorias() {
      const { data, error } = await cliente.from('categorias').select('id, nombre, icono_url, imagen_url, orden, subcategorias(id, nombre)')
        .order('orden').order('id');
      if (error) throw new Error('No se pudo consultar el catálogo.');
      // H24: subcategorías en el mismo orden que el mock, para buscarlas por nombre en la encuesta.
      return data.map(categoria => ({ ...categoria,
        subcategorias: [...(categoria.subcategorias ?? [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')) }));
    },
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
      
    ,async obtenerPreferencias(usuarioId) {
      const { data, error } = await cliente
        .from('preferencias_usuario')
        .select('categorias, encuesta_completada')
        .eq('usuario_id', usuarioId)
        .maybeSingle();

      if (error) throw new Error('No se pudieron obtener las preferencias.');
      
      return data 
        ? { completed: data.encuesta_completada, categories: data.categorias } 
        : { completed: false, categories: [] };
    }
  };
}
