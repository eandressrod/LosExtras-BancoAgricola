// H22: instantánea de Para ti. El orden se conserva durante la visita, en esta pestaña y por perfil; el servidor no lo guarda.
// Una visita nueva empieza tras 30 minutos sin usarla o al cambiar de día en El Salvador.

export const PREFIJO_INSTANTANEA = 'los-extras-instantanea:';
export const DURACION_VISITA_MS = 30 * 60 * 1000;

// Día calendario en El Salvador (AAAA-MM-DD), comparable con validUntil del catálogo.
const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' });
const clave = perfilId => PREFIJO_INSTANTANEA + perfilId;

function escribir(almacen, perfilId, datos) {
  try { almacen?.setItem(clave(perfilId), JSON.stringify(datos)); } catch { /* Sin almacenamiento se vuelve a ordenar. */ }
}

/** Indica si había una visita previa registrada para este perfil que ya terminó por tiempo o cambio de día (H25, CDA 6). */
export function visitaVencida(almacen, perfilId, ahora = new Date()) {
  let guardada;
  try { guardada = JSON.parse(almacen?.getItem(clave(perfilId)) ?? 'null'); } catch { return false; }
  if (!guardada) return false;
  return guardada.dia !== fechaLocal.format(ahora) || ahora.getTime() - guardada.usadaEn >= DURACION_VISITA_MS;
}

/** Guarda la respuesta de una consulta como orden de la visita actual. */
export function guardarInstantanea(almacen, perfilId, consulta, respuesta, ahora = new Date()) {
  escribir(almacen, perfilId, { consulta, respuesta, usadaEn: ahora.getTime(), dia: fechaLocal.format(ahora) });
}

/** Respuesta guardada para la misma consulta en la visita actual, o null. Usarla renueva la visita. */
export function leerInstantanea(almacen, perfilId, consulta, ahora = new Date()) {
  let guardada;
  try { guardada = JSON.parse(almacen?.getItem(clave(perfilId)) ?? 'null'); } catch { return null; }
  const vigente = guardada?.consulta === consulta && guardada.dia === fechaLocal.format(ahora)
    && ahora.getTime() - guardada.usadaEn < DURACION_VISITA_MS;
  if (!vigente) return null;
  escribir(almacen, perfilId, { ...guardada, usadaEn: ahora.getTime() });
  return guardada.respuesta;
}

/** Una promoción que vence durante la visita conserva su lugar y se marca como vencida. */
export function marcarVencidas(promociones, ahora = new Date()) {
  const hoy = fechaLocal.format(ahora);
  return promociones.map(promo => ({ ...promo, vencida: Boolean(promo.validUntil && promo.validUntil < hoy) }));
}

/** Al iniciar o cerrar sesión se olvidan las instantáneas de cualquier perfil. */
export function olvidarInstantaneas(almacen) {
  try {
    for (let indice = almacen.length - 1; indice >= 0; indice -= 1) {
      const nombre = almacen.key(indice);
      if (nombre?.startsWith(PREFIJO_INSTANTANEA)) almacen.removeItem(nombre);
    }
  } catch { /* Sin almacenamiento no hay instantáneas que borrar. */ }
}
