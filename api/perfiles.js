import { listarPerfiles } from '../backend/perfiles.js';
import { obtenerRepositorioUsuariosPrueba } from '../backend/repositorios/index.js';
import { perfilDePrueba } from '../backend/servicios/usuarios-prueba.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export function crearHandlerPerfiles(repos = { publicos:listarPerfiles, pruebas:obtenerRepositorioUsuariosPrueba }) { return {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');
    try {
      const testing = new URL(request.url).searchParams.get('testing') === '1';
      const datos = testing ? (await repos.pruebas().listar()).map(perfilDePrueba) : await repos.publicos();
      return responderJson(datos);
    } catch {
      return responderJson({ error: 'No se pudieron cargar los perfiles.' }, 503);
    }
  }
}; }
export default crearHandlerPerfiles();
