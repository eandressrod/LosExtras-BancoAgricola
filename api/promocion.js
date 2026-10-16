import { filtrarPromociones } from '../backend/promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioProductosMenu } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { tarjetasDelUsuario, elegirTarjeta, rechazoDeTarjeta } from '../backend/servicios/tarjetas.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return metodoNoPermitido('GET');
    }
    const parametros = new URL(request.url).searchParams;
    const id = parametros.get('id');
    if (!id) return responderJson({ error: 'Falta el identificador de la promoción.' }, 400);
    try {
      const perfil = await perfilDeSesion(leerCookie(request), obtenerRepositorioAccesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      // H16: el detalle usa la tarjeta elegida, siempre que sea del dueño de la sesión.
      const eleccion = elegirTarjeta(tarjetasDelUsuario(await obtenerRepositorioProductosMenu().listarTarjetas(perfil.id), perfil), parametros, perfil.tipoTarjeta);
      if (!eleccion.ok) {
        const { cuerpo, estado } = rechazoDeTarjeta(eleccion);
        return responderJson(cuerpo, estado);
      }
      if (!eleccion.tarjeta) return responderJson({ error: 'Promoción no encontrada.' }, 404);
      const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
      const promocion = filtrarPromociones(catalogo, eleccion.tarjeta.tipoTarjeta, []).find(item => item.id === id);
      if (!promocion) return responderJson({ error: 'Promoción no encontrada.' }, 404);
      return responderJson(promocion);
    } catch {
      return responderJson({ error: 'No se pudo cargar la promoción.' }, 503);
    }
  }
};
