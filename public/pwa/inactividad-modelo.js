export function estadoInactividad(plazo, ahora = Date.now()) {
  const segundos = Math.max(0, Math.ceil((plazo - ahora) / 1000));
  return { estado: segundos === 0 ? 'vencida' : segundos <= 20 ? 'aviso' : 'activa', segundos };
}
export function plazoLocal(sesion, ahora = Date.now()) {
  return ahora + Math.max(0, Math.min(sesion.inactivaEn, sesion.expiraEn) - sesion.ahora);
}
