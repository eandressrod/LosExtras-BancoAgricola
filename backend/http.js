// Respuestas JSON de la API de sesión: nunca se guardan en caché.
const SIN_CACHE = { 'Cache-Control': 'no-store' };

export function responderJson(datos, estado = 200, cabeceras = {}) {
  return Response.json(datos, { status: estado, headers: { ...SIN_CACHE, ...cabeceras } });
}

export function responderSinContenido(cabeceras = {}) {
  return new Response(null, { status: 204, headers: { ...SIN_CACHE, ...cabeceras } });
}

export function metodoNoPermitido(permitido) {
  return responderJson({ error: 'Método no permitido.' }, 405, { Allow: permitido });
}
