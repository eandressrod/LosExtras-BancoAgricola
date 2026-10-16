export function estadoInactividad(plazo, ahora = Date.now()) {
  const segundos = Math.max(0, Math.ceil((plazo - ahora) / 1000));
  return { estado: segundos === 0 ? 'vencida' : segundos <= 20 ? 'aviso' : 'activa', segundos };
}
export function plazoLocal(sesion, ahora = Date.now()) {
  return ahora + Math.max(0, Math.min(sesion.inactivaEn, sesion.expiraEn) - sesion.ahora);
}

export function avisoDiscreto(pathname, leyendoMensaje) {
  return pathname === '/promociones.html' || pathname === '/detalle.html' || leyendoMensaje === true;
}

const SEGUNDO_PLANO = 'bancoagricola-app-oculta';

export function leerSegundoPlano(id, storage) {
  try {
    const salida=JSON.parse(storage.getItem(SEGUNDO_PLANO));
    return salida?.id===id && Number.isFinite(salida.desde) && salida.desde>=0 ? salida.desde : null;
  } catch { return null; }
}

export function registrarSegundoPlano(id, storage, ahora = Date.now()) {
  try {
    if (leerSegundoPlano(id,storage)===null) storage.setItem(SEGUNDO_PLANO,JSON.stringify({id,desde:ahora}));
  } catch { /* El documento abierto conserva también su reloj en memoria. */ }
}

export function limpiarSegundoPlano(id, storage) {
  try { if (leerSegundoPlano(id,storage)!==null) storage.removeItem(SEGUNDO_PLANO); } catch {}
}

export function vencioSegundoPlano(desde, ahora = Date.now()) {
  return Number.isFinite(desde) && ahora-desde>=20000;
}
