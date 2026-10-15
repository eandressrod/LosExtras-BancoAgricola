import { obtenerRepositorioAccesos, obtenerRepositorioUsuariosPrueba } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export function crearHandlerApertura(repos = { accesos:obtenerRepositorioAccesos, usuarios:obtenerRepositorioUsuariosPrueba }) {
  return { async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');
    try {
      const perfil = await perfilDeSesion(leerCookie(request), repos.accesos());
      if (!perfil) return responderJson({ error:'Inicia sesión para continuar.' },401);
      if (!await repos.usuarios().marcarApertura(perfil.id)) return responderJson({ error:'No se encontró el usuario.' },404);
      return responderJson({ promocionesAbiertas:true });
    } catch { return responderJson({ error:'No se pudo registrar la apertura de Promociones.' },503); }
  } };
}
export default crearHandlerApertura();
