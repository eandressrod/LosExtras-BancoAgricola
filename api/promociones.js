import { filtrarPromociones } from '../backend/promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return metodoNoPermitido('GET');
    }
    try {
      const perfil = await perfilDeSesion(leerCookie(request), obtenerRepositorioAccesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      const preferencias = await obtenerRepositorioPreferencias().obtenerPreferencias(perfil.id);
      const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
      return responderJson(filtrarPromociones(catalogo, perfil.tipoTarjeta, preferencias.completed ? preferencias.categories : []));
    } catch {
      return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
    }
  }
};
