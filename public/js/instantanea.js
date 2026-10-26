// H22: instantánea de Para ti. El orden se conserva durante la visita, en esta pestaña y por perfil; el servidor no lo guarda.
// Una visita nueva empieza tras 30 minutos sin usarla o al cambiar de día en El Salvador.

//
// Ciclo de vida:
//   - promociones.js guarda cada respuesta recibida de /api/para-ti con su consulta (URL con filtros y tarjeta);
//   - al volver del detalle la lee; si la consulta, el día o la visita no coinciden, vuelve a pedir el orden;
//   - leerla renueva la visita; iniciar o cerrar sesión borra todas (comun.js).
// Todos los accesos toleran un almacenamiento ausente o lleno: en ese caso simplemente se recalcula.

export const PREFIJO_INSTANTANEA = 'los-extras-instantanea:';
export const DURACION_VISITA_MS = 30 * 60 * 1000;

// Día calendario en El Salvador (AAAA-MM-DD), comparable con validUntil del catálogo.
const fechaLocal = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' });

/**
 * SCRUM-133: sin ?tarjeta= Para ti evalúa todas las tarjetas propias. Cada alcance ('todas' o una tarjeta) tiene su propia
 * instantánea, de modo que cambiar entre ellos no mezcla ni pisa sus órdenes.
 */
export function alcanceDeConsulta(consulta) {
  const tarjeta = new URL(consulta, 'http://local').searchParams.get('tarjeta');
  return tarjeta ? 'tarjeta:' + tarjeta : 'todas';
}
const clave = (perfilId, consulta) => PREFIJO_INSTANTANEA + perfilId + ':' + alcanceDeConsulta(consulta);

function escribir(almacen, perfilId, consulta, datos) {
  try { almacen?.setItem(clave(perfilId, consulta), JSON.stringify(datos)); } catch { /* Sin almacenamiento se vuelve a ordenar. */ }
}

/**
 * H25 (CDA 6): hay visita en curso si el perfil tiene, en cualquier alcance, una instantánea de hoy usada hace menos de
 * 30 minutos. Sin ella (pestaña nueva, sesión nueva o visita terminada) el chip «Hoy busco» de la URL no se conserva.
 */
export function visitaVigente(almacen, perfilId, ahora = new Date()) {
  const prefijo = PREFIJO_INSTANTANEA + perfilId + ':';
  try {
    for (let indice = 0; indice < almacen.length; indice += 1) {
      const nombre = almacen.key(indice);
      if (!nombre?.startsWith(prefijo)) continue;
      const guardada = JSON.parse(almacen.getItem(nombre) ?? 'null');
      if (guardada?.dia === fechaLocal.format(ahora) && ahora.getTime() - guardada.usadaEn < DURACION_VISITA_MS) return true;
    }
  } catch { /* Sin almacenamiento legible no hay visita que conservar. */ }
  return false;
}

/** Guarda la respuesta de una consulta como orden de la visita actual. */
export function guardarInstantanea(almacen, perfilId, consulta, respuesta, ahora = new Date()) {
  escribir(almacen, perfilId, consulta, { consulta, respuesta, usadaEn: ahora.getTime(), dia: fechaLocal.format(ahora) });
}

/** Respuesta guardada para la misma consulta en la visita actual, o null. Usarla renueva la visita. */
export function leerInstantanea(almacen, perfilId, consulta, ahora = new Date()) {
  let guardada;
  try { guardada = JSON.parse(almacen?.getItem(clave(perfilId, consulta)) ?? 'null'); } catch { return null; }
  const vigente = guardada?.consulta === consulta && guardada.dia === fechaLocal.format(ahora)
    && ahora.getTime() - guardada.usadaEn < DURACION_VISITA_MS;
  if (!vigente) return null;
  escribir(almacen, perfilId, consulta, { ...guardada, usadaEn: ahora.getTime() });
  return guardada.respuesta;
}

/** Una promoción que vence durante la visita conserva su lugar y se marca como vencida. */
export function marcarVencidas(promociones, ahora = new Date()) {
  const hoy = fechaLocal.format(ahora);
  return promociones.map(promo => ({ ...promo, vencida: Boolean(promo.validUntil && promo.validUntil < hoy) }));
}

// H23: la pregunta en contexto aparece como máximo una vez por visita, con la misma regla de visita que la instantánea.
export const PREFIJO_PREGUNTA = 'los-extras-pregunta:';

/** Indica si la pregunta ya se mostró en la visita actual del perfil; consultarla renueva la visita. */
export function preguntaMostradaEnVisita(almacen, perfilId, ahora = new Date()) {
  let marca;
  try { marca = JSON.parse(almacen?.getItem(PREFIJO_PREGUNTA + perfilId) ?? 'null'); } catch { return false; }
  const vigente = marca?.dia === fechaLocal.format(ahora) && ahora.getTime() - marca.usadaEn < DURACION_VISITA_MS;
  if (vigente) marcarPreguntaMostrada(almacen, perfilId, ahora);
  return vigente;
}

export function marcarPreguntaMostrada(almacen, perfilId, ahora = new Date()) {
  try {
    almacen?.setItem(PREFIJO_PREGUNTA + perfilId, JSON.stringify({ usadaEn: ahora.getTime(), dia: fechaLocal.format(ahora) }));
  } catch { /* Sin almacenamiento la pregunta puede volver en la misma visita. */ }
}

/** Al iniciar o cerrar sesión se olvidan las instantáneas (y la pregunta mostrada) de cualquier perfil. */
export function olvidarInstantaneas(almacen) {
  try {
    for (let indice = almacen.length - 1; indice >= 0; indice -= 1) {
      const nombre = almacen.key(indice);
      if (nombre?.startsWith(PREFIJO_INSTANTANEA) || nombre?.startsWith(PREFIJO_PREGUNTA)) almacen.removeItem(nombre);
    }
  } catch { /* Sin almacenamiento no hay instantáneas que borrar. */ }
}
