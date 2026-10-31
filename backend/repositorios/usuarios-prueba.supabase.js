// H21 (ADR-010): cada marca de la encuesta y su columna en perfiles.
const COLUMNAS_MARCA = { 'hoja-mostrada':'encuesta_hoja_mostrada', 'aviso-cerrado':'encuesta_aviso_cerrado' };

export function crearRepositorioUsuariosPruebaSupabase(cliente) {
  return {
    async listar() {
      const { data, error } = await cliente.from('perfiles')
        .select('id,nombre,tipo_tarjeta,usuario_acceso,clave_prueba,promociones_abiertas').order('nombre').order('id');
      if (error) throw new Error('No se pudieron cargar los usuarios.');
      return (data ?? []).map(p => ({ id:p.id, nombre:p.nombre, tipoTarjeta:p.tipo_tarjeta,
        usuarioAcceso:p.usuario_acceso, clavePrueba:p.clave_prueba, promocionesAbiertas:p.promociones_abiertas }));
    },
    async marcarApertura(id, marca) {
      const cambios = { promociones_abiertas:true, ...(marca ? { [COLUMNAS_MARCA[marca]]:true } : {}) };
      const { data, error } = await cliente.from('perfiles').update(cambios).eq('id',id)
        .select('promociones_abiertas,encuesta_hoja_mostrada,encuesta_aviso_cerrado').maybeSingle();
      if (error) throw new Error('No se pudo registrar la apertura.');
      return data && { promocionesAbiertas:data.promociones_abiertas, hojaMostrada:data.encuesta_hoja_mostrada, avisoCerrado:data.encuesta_aviso_cerrado };
    }
  };
}
