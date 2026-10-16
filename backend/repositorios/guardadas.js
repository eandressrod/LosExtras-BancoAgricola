import { obtenerClienteSupabase } from '../config/supabase.js';

// En las pruebas cada usuario tiene una lista de ids. includes evita el duplicado.
const memoria = {};

export function reiniciarGuardadasMock() {
  for (const usuarioId of Object.keys(memoria)) delete memoria[usuarioId];
}

export function crearRepositorioGuardadasMemoria(almacen = memoria) {
  return {
    async listar(usuarioId) {
      return almacen[usuarioId] ? almacen[usuarioId].slice() : [];
    },
    async guardar(usuarioId, promocionId) {
      if (!almacen[usuarioId]) almacen[usuarioId] = [];
      if (!almacen[usuarioId].includes(promocionId)) almacen[usuarioId].push(promocionId);
    },
    async quitar(usuarioId, promocionId) {
      if (!almacen[usuarioId]) return;
      almacen[usuarioId] = almacen[usuarioId].filter(id => id !== promocionId);
    }
  };
}

export function crearRepositorioGuardadasSupabase(cliente) {
  return {
    async listar(usuarioId) {
      const { data, error } = await cliente
        .from('promociones_guardadas')
        .select('promocion_id')
        .eq('usuario_id', usuarioId);
      if (error) throw new Error('No se pudieron consultar las promociones guardadas.');
      return (data || []).map(fila => fila.promocion_id);
    },
    async guardar(usuarioId, promocionId) {
      const { error } = await cliente
        .from('promociones_guardadas')
        .upsert(
          { usuario_id: usuarioId, promocion_id: promocionId },
          { onConflict: 'usuario_id,promocion_id' }
        );
      if (error) throw new Error('No se pudo guardar la promoción.');
    },
    async quitar(usuarioId, promocionId) {
      const { error } = await cliente
        .from('promociones_guardadas')
        .delete()
        .eq('usuario_id', usuarioId)
        .eq('promocion_id', promocionId);
      if (error) throw new Error('No se pudo quitar la promoción.');
    }
  };
}

export function obtenerRepositorioGuardadas() {
  const source = process.env.DATA_SOURCE || 'mock';
  if (source === 'mock') return crearRepositorioGuardadasMemoria();
  if (source === 'supabase') return crearRepositorioGuardadasSupabase(obtenerClienteSupabase());
  throw new Error('DATA_SOURCE debe ser mock o supabase.');
}
