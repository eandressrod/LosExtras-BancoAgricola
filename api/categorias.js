import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { obtenerRepositorioAccesos, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');
    try {
      if (!await perfilDeSesion(leerCookie(request), obtenerRepositorioAccesos())) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      return responderJson(await obtenerRepositorioPreferencias().obtenerCategorias());
    } catch { return responderJson({ error: 'No se pudieron cargar las categorías.' }, 503); }
  }
};
