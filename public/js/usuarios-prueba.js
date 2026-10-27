export function credencialesDePerfil(perfil) {
  return { usuario:perfil.usuarioAcceso ?? '', clave:perfil.clavePrueba ?? '' };
}

/** Registra la apertura de Promociones y devuelve las marcas de la encuesta (ADR-010): {promocionesAbiertas, hojaMostrada, avisoCerrado}. */
export async function registrarAperturaPromociones(peticion = fetch) {
  const respuesta = await peticion('/api/promociones-apertura', { method:'POST' });
  if (!respuesta.ok) throw new Error('No se pudo registrar la apertura de Promociones. Intenta de nuevo.');
  return respuesta.json();
}

/** H21: guarda una marca de la encuesta ('hoja-mostrada' o 'aviso-cerrado') y devuelve el estado guardado. */
export async function marcarEncuesta(marca, peticion = fetch) {
  const respuesta = await peticion('/api/promociones-apertura', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:JSON.stringify({ marca }) });
  if (!respuesta.ok) throw new Error('No se pudo guardar el estado de la encuesta.');
  return respuesta.json();
}
