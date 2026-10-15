import { estadoDeSesion } from '../../backend/servicios/autenticacion.js';
import { leerCookie, cookieVencida } from '../../backend/servicios/sesion.js';
import { obtenerRepositorioAccesos } from '../../backend/repositorios/index.js';
import { responderJson, metodoNoPermitido } from '../../backend/http.js';
export default {
  async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');
    // Las renovaciones solo se aceptan desde el mismo origen.
    const origin = request.headers.get('origin');
    if ((origin && origin !== new URL(request.url).origin) || request.headers.get('sec-fetch-site') === 'cross-site') {
      return responderJson({ error: 'Solicitud no permitida.' }, 403);
    }
    try {
      const estado = await estadoDeSesion(leerCookie(request), obtenerRepositorioAccesos(), true);
      return estado ? responderJson(estado) : responderJson({ error: 'Tu sesión terminó. Inicia sesión nuevamente.' }, 401, { 'Set-Cookie': cookieVencida(request) });
    } catch {
      return responderJson({ error: 'No se pudo continuar la sesión. Revisa tu conexión e intenta de nuevo.' }, 503);
    }
  }
};
