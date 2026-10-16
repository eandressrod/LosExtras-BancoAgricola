import { obtenerRepositorioAccesos } from '../../backend/repositorios/index.js';
import { estadoDeSesion } from '../../backend/servicios/autenticacion.js';
import { leerCookie } from '../../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../../backend/http.js';

// Las páginas privadas consultan este endpoint para conocer el perfil activo.
// Sin sesión válida responde 200 con perfil null: el login lo consulta en cada primera visita.
export default {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');
    try {
      const repo = obtenerRepositorioAccesos();
      const estado = await estadoDeSesion(leerCookie(request), repo);
      return responderJson(estado ?? { perfil: null, sesion: null });
    } catch (error) {
      console.error('Verificación de sesión no disponible:', error.message);
      return responderJson({ error: 'No se pudo verificar la sesión. Intenta de nuevo más tarde.' }, 503);
    }
  }
};
