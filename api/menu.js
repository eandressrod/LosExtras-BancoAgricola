import { obtenerRepositorioAccesos, obtenerRepositorioCuentas, obtenerRepositorioEstadoEncuesta, obtenerRepositorioPreferencias, obtenerRepositorioProductosMenu } from '../backend/repositorios/index.js';
import { obtenerDatosMenu } from '../backend/servicios/menu.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../backend/http.js';

export function crearHandlerMenu(repositorios = {
  accesos: obtenerRepositorioAccesos,
  cuentas: obtenerRepositorioCuentas,
  encuesta: obtenerRepositorioEstadoEncuesta,
  preferencias: obtenerRepositorioPreferencias,
  productos: obtenerRepositorioProductosMenu
}) {
  return {
    async fetch(request) {
      if (request.method !== 'GET') return metodoNoPermitido('GET');
      try {
        const { perfil, respuesta } = await exigirPerfil(request, repositorios.accesos());
        if (respuesta) return respuesta;
        
        // Protegemos las pruebas viejas: si no inyectaron preferencias, pasamos null
        const repoPreferencias = repositorios.preferencias ? repositorios.preferencias() : null;
        
        const data = await obtenerDatosMenu(perfil, repositorios.cuentas(), repositorios.encuesta(), repoPreferencias);
        if (repositorios.productos) Object.assign(data, await repositorios.productos().resumen(perfil.id));
        return responderJson(data);
      } catch (error) {
        console.error('Consulta de menú no disponible:', error.message);
        return responderJson({ error: 'No se pudieron cargar los datos del menú. Intenta de nuevo más tarde.' }, 503);
      }
    }
  };
}

export default crearHandlerMenu();
