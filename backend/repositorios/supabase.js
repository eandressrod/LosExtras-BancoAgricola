const CAMPOS_PROMOCION = 'id, merchant, category, benefit, description, payment, restrictions';

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} client
 * @returns {import('./contrato.js').RepositorioCatalogo}
 */
export function crearRepositorioSupabase(client) {
  return {
    async listarPerfiles() {
      const { data, error } = await client.from('perfiles').select('id, nombre').order('id');
      if (error) throw new Error('No se pudieron consultar los perfiles.');
      return data;
    },
    async listarPromociones() {
      const { data, error } = await client.from('promociones').select(CAMPOS_PROMOCION).order('orden').order('id');
      if (error) throw new Error('No se pudieron consultar las promociones.');
      return data;
    },
    async buscarPromocion(id) {
      const { data, error } = await client.from('promociones').select(CAMPOS_PROMOCION).eq('id', id).maybeSingle();
      if (error) throw new Error('No se pudo consultar la promoción.');
      return data;
    }
  };
}
