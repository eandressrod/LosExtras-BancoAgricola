import { filtrarPromociones } from '../backend/promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return metodoNoPermitido('GET');
    }
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return responderJson({ error: 'Falta el identificador de la promoción.' }, 400);
    try {
      const perfil = await perfilDeSesion(leerCookie(request), obtenerRepositorioAccesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
      const promocion = filtrarPromociones(catalogo, perfil.tipoTarjeta, []).find(item => item.id === id);
      if (!promocion) return responderJson({ error: 'Promoción no encontrada.' }, 404);
      return responderJson(promocion);
    } catch {
      return responderJson({ error: 'No se pudo cargar la promoción.' }, 503);
    }
  }
};
