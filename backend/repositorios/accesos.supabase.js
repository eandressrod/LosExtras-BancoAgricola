const CAMPOS_PERFIL = 'id, nombre, tipo_tarjeta';
const aPerfil = fila => ({ id: fila.id, nombre: fila.nombre, tipoTarjeta: fila.tipo_tarjeta });

/**
 * Accesos de prueba guardados en public.perfiles (usuario_acceso y contrasena_hash).
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @returns {import('./contrato.js').RepositorioAccesos}
 */
export function crearRepositorioAccesosSupabase(client) {
  return {
    async buscarAccesoPorUsuario(usuario) {
      const { data, error } = await client.from('perfiles')
        .select(`${CAMPOS_PERFIL}, contrasena_hash`).eq('usuario_acceso', usuario).maybeSingle();
      if (error) throw new Error('No se pudo consultar el acceso.');
      return data && { ...aPerfil(data), contrasenaHash: data.contrasena_hash };
    },
    async buscarPerfilPorId(id) {
      const { data, error } = await client.from('perfiles').select(CAMPOS_PERFIL).eq('id', id).maybeSingle();
      if (error) throw new Error('No se pudo consultar el perfil.');
      return data && aPerfil(data);
    }
  };
}
