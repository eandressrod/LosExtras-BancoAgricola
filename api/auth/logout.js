import { cookieVencida, leerCookie } from '../../backend/servicios/sesion.js';
import { cerrarSesion } from '../../backend/servicios/autenticacion.js';
import { obtenerRepositorioAccesos } from '../../backend/repositorios/index.js';
import { responderJson, responderSinContenido, metodoNoPermitido } from '../../backend/http.js';

// Revoca en servidor antes de borrar la cookie; una copia tampoco puede reutilizarse.
export default {
  async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');
    try {
      const token = leerCookie(request);
      if (token) await cerrarSesion(token, obtenerRepositorioAccesos());
      return responderSinContenido({ 'Set-Cookie': cookieVencida(request) });
    } catch (error) {
      console.error('Cierre de sesión no disponible:', error.message);
      return responderJson({ error: 'No se pudo cerrar la sesión. Intenta de nuevo más tarde.' }, 503);
    }
  }
};
