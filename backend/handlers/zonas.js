// H8: GET /api/zonas. Lista fija de zonas con su centro, para elegir el origen de Cerca de ti sin ubicación.
import { obtenerRepositorio, obtenerRepositorioAccesos } from '../repositorios/index.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../http.js';

export function crearHandlerZonas(repositorios = { accesos: obtenerRepositorioAccesos, catalogo: obtenerRepositorio }) {
  return { async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');
    try {
      const { respuesta } = await exigirPerfil(request, repositorios.accesos());
      if (respuesta) return respuesta;
      return responderJson({ zonas: await repositorios.catalogo().listarZonas() });
    } catch {
      return responderJson({ error: 'No se pudieron cargar las zonas.' }, 503);
    }
  } };
}

export default crearHandlerZonas();
