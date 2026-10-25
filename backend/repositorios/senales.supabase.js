// H22: registro de señales en Supabase (tabla senales_usuario). El propietario viene siempre de la sesión.
const TABLA = 'senales_usuario';
const COLUMNAS = 'id, clase, ambito, valor, origen, creada_en, activa';
// Columnas de la restricción única: declarar dos veces lo mismo actualiza la fila existente (upsert).
const UNICA = 'usuario_id,clase,ambito,valor';

const aSenal = fila => ({
  id: Number(fila.id), clase: fila.clase, ambito: fila.ambito, valor: fila.valor, origen: fila.origen,
  creadaEn: fila.creada_en, activa: fila.activa
});

// El error de Supabase no sale de aquí: se reemplaza por un mensaje para la persona y el handler responde 503.
function comprobar({ data, error }, mensaje) {
  if (error) throw new Error(mensaje);
  return data;
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} cliente
 * @returns {import('./contrato.js').RepositorioSenales}
 */
export function crearRepositorioSenalesSupabase(cliente, reloj = () => new Date()) {
  const fila = (usuarioId, { clase, ambito, valor, origen }) =>
    ({ usuario_id: usuarioId, clase, ambito, valor, origen, activa: true, actualizada_en: reloj().toISOString() });
  return {
    async listarActivas(usuarioId) {
      const data = comprobar(await cliente.from(TABLA).select(COLUMNAS).eq('usuario_id', usuarioId).eq('activa', true).order('id'),
        'No se pudieron consultar tus intereses.');
      return data.map(aSenal);
    },
    async activar(usuarioId, senal) {
      const data = comprobar(await cliente.from(TABLA).upsert(fila(usuarioId, senal), { onConflict: UNICA }).select(COLUMNAS).single(),
        'No se pudo guardar tu interés.');
      return aSenal(data);
    },
    // El filtro por usuario_id impide cambiar una señal ajena: sin fila coincidente devuelve null.
    async cambiarEstado(usuarioId, id, activa) {
      const data = comprobar(await cliente.from(TABLA).update({ activa, actualizada_en: reloj().toISOString() })
        .eq('usuario_id', usuarioId).eq('id', id).select(COLUMNAS).maybeSingle(), 'No se pudo actualizar tu interés.');
      return data ? aSenal(data) : null;
    },
    // Espejo de /api/preferencias en tres pasos: leer las activas, activar las elegidas y desactivar las quitadas.
    async sincronizarCategorias(usuarioId, categorias, origen) {
      const activas = comprobar(await cliente.from(TABLA).select('id, valor').eq('usuario_id', usuarioId)
        .eq('clase', 'interes').eq('ambito', 'categoria').eq('activa', true), 'No se pudieron consultar tus intereses.');
      if (categorias.length) {
        comprobar(await cliente.from(TABLA).upsert(categorias.map(valor => fila(usuarioId, { clase: 'interes', ambito: 'categoria', valor, origen })),
          { onConflict: UNICA }), 'No se pudieron guardar tus intereses.');
      }
      const quitadas = activas.filter(senal => !categorias.includes(senal.valor)).map(senal => Number(senal.id));
      if (quitadas.length) {
        comprobar(await cliente.from(TABLA).update({ activa: false, actualizada_en: reloj().toISOString() })
          .eq('usuario_id', usuarioId).in('id', quitadas), 'No se pudieron guardar tus intereses.');
      }
    }
  };
}
