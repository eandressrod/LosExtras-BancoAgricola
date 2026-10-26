// H23: respuestas a la pregunta en contexto en Supabase (tabla respuestas_pregunta). El propietario viene de la sesión.
const TABLA = 'respuestas_pregunta';

function comprobar({ data, error }, mensaje) {
  if (error) throw new Error(mensaje);
  return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} cliente
 * @returns {import('./contrato.js').RepositorioRespuestasPregunta}
 */
export function crearRepositorioRespuestasSupabase(cliente, reloj = () => new Date()) {
  return {
    async listar(usuarioId) {
      const data = comprobar(await cliente.from(TABLA).select('pregunta, valor, respuesta, respondida_en').eq('usuario_id', usuarioId),
        'No se pudieron consultar tus respuestas.');
      return data.map(fila => ({ pregunta: fila.pregunta, valor: fila.valor, respuesta: fila.respuesta, respondidaEn: fila.respondida_en }));
    },
    // Responder de nuevo actualiza la fila: solo cuenta la última respuesta.
    async guardar(usuarioId, { pregunta, valor, respuesta }) {
      comprobar(await cliente.from(TABLA).upsert({ usuario_id: usuarioId, pregunta, valor, respuesta, respondida_en: reloj().toISOString() },
        { onConflict: 'usuario_id,pregunta,valor' }), 'No se pudo guardar tu respuesta.');
    }
  };
}
