import { obtenerRepositorioAccesos, obtenerRepositorioProductosMenu } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';
import { validarId, errorDatos } from '../backend/servicios/productos-menu.js';

export function crearHandlerMensajes(repos = { accesos: obtenerRepositorioAccesos, productos: obtenerRepositorioProductosMenu }) {
  return { async fetch(request) {
    if (!['GET', 'PATCH'].includes(request.method)) return metodoNoPermitido('GET, PATCH');
    try {
      const perfil = await perfilDeSesion(leerCookie(request), repos.accesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      const repo = repos.productos();
      if (request.method === 'GET') return responderJson(await repo.listarMensajes(perfil.id));
      const cuerpo = await request.json().catch(() => { throw errorDatos('Formato de datos inválido.'); });
      const mensaje = await repo.leerMensaje(perfil.id, validarId(cuerpo?.id));
      return mensaje ? responderJson(mensaje) : responderJson({ error: 'No se encontró el mensaje.' }, 404);
    } catch (error) { return responderJson({ error: error.estado ? error.message : 'No se pudieron cargar o guardar los mensajes. Intenta de nuevo.' }, error.estado ?? 503); }
  } };
}
export default crearHandlerMensajes();
