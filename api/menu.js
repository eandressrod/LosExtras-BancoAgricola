import { obtenerRepositorioAccesos, obtenerRepositorioCuentas, obtenerRepositorioEstadoEncuesta, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { obtenerDatosMenu } from '../backend/servicios/menu.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export function crearHandlerMenu(repositorios = {
  accesos: obtenerRepositorioAccesos,
  cuentas: obtenerRepositorioCuentas,
  encuesta: obtenerRepositorioEstadoEncuesta,
  preferencias: obtenerRepositorioPreferencias
}) {
  return {
    async fetch(request) {
      if (request.method !== 'GET') return metodoNoPermitido('GET');
      try {
        const perfil = await perfilDeSesion(leerCookie(request), repositorios.accesos());
        if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
        
        // Protegemos las pruebas viejas: si no inyectaron preferencias, pasamos null
        const repoPreferencias = repositorios.preferencias ? repositorios.preferencias() : null;
        
        const data = await obtenerDatosMenu(perfil, repositorios.cuentas(), repositorios.encuesta(), repoPreferencias);
        return responderJson(data);
      } catch (error) {
        console.error('Consulta de menú no disponible:', error.message);
        return responderJson({ error: 'No se pudieron cargar los datos del menú. Intenta de nuevo más tarde.' }, 503);
      }
    }
  };
}

export default crearHandlerMenu();