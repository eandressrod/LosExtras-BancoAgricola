// Menú y Promociones consumen tarjetas_usuario; no se inventan tarjetas a partir del perfil.
export function tarjetasPropias(tarjetas) {
  return tarjetas.filter(t => t.cuentaId && ['basica','black'].includes(t.tipoTarjeta))
    .map(t => ({ id:t.id, cuentaId:t.cuentaId, tipoTarjeta:t.tipoTarjeta,
      nombre:t.producto ? 'Tarjeta de ' + t.producto.modalidad + ' ' + t.producto.nombre : t.nombre,
      numeroEnmascarado:t.numeroEnmascarado }));
}
export function tarjetasDelUsuario(tarjetas) { return tarjetasPropias(tarjetas); }

/** La elección siempre pertenece a las tarjetas del propietario verificado. */
export function elegirTarjeta(tarjetas, parametros, tipoDelPerfil) {
  const valores = parametros.getAll('tarjeta');
  if (valores.length === 0) return { ok:true, tarjeta:tarjetas.find(t => t.tipoTarjeta === tipoDelPerfil) ?? tarjetas[0] ?? null };
  if (valores.length > 1 || !valores[0]) return { ok:false, motivo:'invalida' };
  const tarjeta = tarjetas.find(t => t.id === valores[0]);
  return tarjeta ? { ok:true, tarjeta } : { ok:false, motivo:'ajena' };
}

export function rechazoDeTarjeta(eleccion) {
  return eleccion.motivo === 'ajena'
    ? { cuerpo:{error:'Tarjeta no encontrada.'},estado:404 }
    : { cuerpo:{error:'Tarjeta no válida.'},estado:400 };
}
