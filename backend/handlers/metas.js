import { obtenerRepositorioAccesos, obtenerRepositorioProductosMenu } from '../repositorios/index.js';
import { perfilDeSesion } from '../servicios/autenticacion.js';
import { leerCookie } from '../servicios/sesion.js';
import { responderJson, responderSinContenido, metodoNoPermitido } from '../http.js';
import { validarMeta, validarId, errorDatos } from '../servicios/productos-menu.js';

export function crearHandlerMetas(repos = { accesos: obtenerRepositorioAccesos, productos: obtenerRepositorioProductosMenu }) {
  return { async fetch(request) {
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(request.method)) return metodoNoPermitido('GET, POST, PATCH, DELETE');
    try {
      const perfil = await perfilDeSesion(leerCookie(request), repos.accesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      const repo = repos.productos();
      if (request.method === 'GET') return responderJson(await repo.listarMetas(perfil.id));
      const cuerpo = await request.json().catch(() => { throw errorDatos('Formato de datos inválido.'); });
      if (request.method === 'POST') return responderJson(await repo.crearMeta(perfil.id, validarMeta(cuerpo)), 201);
      const id = validarId(cuerpo?.id);
      if (request.method === 'DELETE') return await repo.eliminarMeta(perfil.id, id) ? responderSinContenido() : responderJson({ error: 'No se encontró la meta.' }, 404);
      const meta = await repo.editarMeta(perfil.id, id, validarMeta(cuerpo));
      return meta ? responderJson(meta) : responderJson({ error: 'No se encontró la meta.' }, 404);
    } catch (error) { return responderJson({ error: error.estado ? error.message : 'No se pudieron cargar o guardar las metas. Intenta de nuevo.' }, error.estado ?? 503); }
  } };
}
export default crearHandlerMetas();
