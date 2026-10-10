const CAMPOS_PROMOCION = 'id, merchant, category, benefit, description, payment, restrictions';
const CAMPOS_CATALOGO = `${CAMPOS_PROMOCION}, imageUrl:imagen_url, imageAlt:imagen_alt, detailDescription:descripcion_detalle, validFrom:vigencia_desde, validUntil:vigencia_hasta, usageDays:dias_uso, comercio:comercios(nombre, logoUrl:logo_url), beneficios:beneficios_tarjeta(tipo_tarjeta, beneficio, medio_pago, restricciones, compra_minima, tope_descuento)`;

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
    async listarPromocionesConBeneficios() {
      const { data, error } = await client.from('promociones')
        .select(CAMPOS_CATALOGO)
        .order('orden').order('id');
      if (error) throw new Error('No se pudieron consultar los beneficios.');
      return data;
    },
    async buscarPromocion(id) {
      const { data, error } = await client.from('promociones').select(CAMPOS_PROMOCION).eq('id', id).maybeSingle();
      if (error) throw new Error('No se pudo consultar la promoción.');
      return data;
    }
  };
}
