/** Consulta de solo lectura para H2; H3 guarda las preferencias. */
export function crearRepositorioEstadoEncuestaSupabase(cliente) {
  return {
    async estaCompletada(usuarioId) {
      const { data, error } = await cliente.from('preferencias_usuario')
        .select('encuesta_completada').eq('usuario_id', usuarioId).maybeSingle();
      if (error) throw new Error('No se pudo consultar el estado de la encuesta.');
      return data?.encuesta_completada === true;
    }
  };
}
