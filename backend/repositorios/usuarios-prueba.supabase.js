export function crearRepositorioUsuariosPruebaSupabase(cliente) {
  return {
    async listar() {
      const { data, error } = await cliente.from('perfiles')
        .select('id,nombre,tipo_tarjeta,usuario_acceso,clave_prueba,promociones_abiertas').order('nombre').order('id');
      if (error) throw new Error('No se pudieron cargar los usuarios.');
      return (data ?? []).map(p => ({ id:p.id, nombre:p.nombre, tipoTarjeta:p.tipo_tarjeta,
        usuarioAcceso:p.usuario_acceso, clavePrueba:p.clave_prueba, promocionesAbiertas:p.promociones_abiertas }));
    },
    async marcarApertura(id) {
      const { data, error } = await cliente.from('perfiles').update({ promociones_abiertas:true }).eq('id',id).select('id').maybeSingle();
      if (error) throw new Error('No se pudo registrar la apertura.');
      return data !== null;
    }
  };
}
