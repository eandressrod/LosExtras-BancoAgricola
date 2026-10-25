import { perfilDeSesion } from './servicios/autenticacion.js';
import { leerCookie } from './servicios/sesion.js';

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

/**
 * H22: perfil dueño de la sesión o la respuesta 401 lista para devolver. Lo usan los handlers nuevos;
 * los demás pasan a este helper en T3 (SCRUM-130).
 * @param {Request} request
 * @param {import('./repositorios/contrato.js').RepositorioAccesos} repoAccesos
 * @returns {Promise<{ perfil: import('./repositorios/contrato.js').PerfilSesion } | { respuesta: Response }>}
 */
export async function exigirPerfil(request, repoAccesos) {
  const perfil = await perfilDeSesion(leerCookie(request), repoAccesos);
  return perfil ? { perfil } : { respuesta: responderJson({ error: 'Inicia sesión para continuar.' }, 401) };
}
