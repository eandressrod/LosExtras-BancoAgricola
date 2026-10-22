const CAMPOS_PROMOCION = 'id, merchant, category, benefit, description, payment, restrictions';
// H24: campos del contrato del catálogo, comercio con subcategoría y cobertura, y sucursales participantes en la misma consulta.
const CAMPOS_CATALOGO = `${CAMPOS_PROMOCION}, imageUrl:imagen_url, imageAlt:imagen_alt, detailDescription:descripcion_detalle, validFrom:vigencia_desde, validUntil:vigencia_hasta, usageDays:dias_uso, ` +
  'title:titulo, conditions:condiciones, instructions:instrucciones, channels:canales, benefitType:tipo_beneficio, decisiveCondition:condicion_decisiva, ' +
  'intentTags:etiquetas_intencion, addedOn:fecha_alta, occasions:ocasiones, priceLevel:nivel_precio, categoria:categorias!promociones_categoria_fkey(nombre), ' +
  'comercio:comercios(id, nombre, logoUrl:logo_url, priceLevel:nivel_precio, occasions:ocasiones, recognizable:reconocible, sensitive:sensible, ' +
  'refineBy:afinar_por, subcategoria:subcategorias(id, nombre), cobertura(zonaId:zona_id, estado)), ' +
  'sucursales:promocion_sucursales(sucursal:sucursales(id, nombre, direccion, latitud, longitud, zonaId:zona_id)), ' +
  'beneficios:beneficios_tarjeta(tipo_tarjeta, beneficio, medio_pago, restricciones, compra_minima, tope_descuento)';

/** Ordena las relaciones como el mock: PostgREST no garantiza su orden. */
function ordenarRelaciones(promocion) {
  const cobertura = promocion.comercio?.cobertura;
  return {
    ...promocion,
    ...(promocion.comercio && { comercio: { ...promocion.comercio,
      ...(cobertura && { cobertura: [...cobertura].sort((a, b) => a.zonaId.localeCompare(b.zonaId)) }) } }),
    ...(promocion.sucursales && { sucursales: [...promocion.sucursales].sort((a, b) => a.sucursal.id.localeCompare(b.sucursal.id)) })
  };
}

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
      return data.map(ordenarRelaciones);
    },
    async buscarPromocion(id) {
      const { data, error } = await client.from('promociones').select(CAMPOS_PROMOCION).eq('id', id).maybeSingle();
      if (error) throw new Error('No se pudo consultar la promoción.');
      return data;
    }
  };
}
