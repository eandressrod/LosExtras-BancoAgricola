import { obtenerRepositorioAccesos } from '../../backend/repositorios/index.js';
import { perfilDeSesion } from '../../backend/servicios/autenticacion.js';
import { leerCookie } from '../../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../../backend/http.js';

// Las páginas privadas consultan este endpoint para conocer el perfil activo.
export default {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');
    try {
      const repo = obtenerRepositorioAccesos();
      const perfil = await perfilDeSesion(leerCookie(request), repo);
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      return responderJson({ perfil });
    } catch (error) {
      console.error('Verificación de sesión no disponible:', error.message);
      return responderJson({ error: 'No se pudo verificar la sesión. Intenta de nuevo más tarde.' }, 503);
    }
  }
};
