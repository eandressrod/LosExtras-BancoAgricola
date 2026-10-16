import { filtrarPromociones } from '../promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioPreferencias } from '../repositorios/index.js';
import { obtenerRepositorioGuardadas } from '../repositorios/guardadas.js';
import { guardarPromocion, quitarPromocion, seleccionarGuardadasVisibles } from '../servicios/guardadas.js';
import { perfilDeSesion } from '../servicios/autenticacion.js';
import { leerCookie } from '../servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'DELETE') {
      return metodoNoPermitido('GET, POST, DELETE');
    }

    try {
      const perfil = await perfilDeSesion(leerCookie(request), obtenerRepositorioAccesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);

      const repo = obtenerRepositorioGuardadas();

      if (request.method === 'GET') {
        const ids = await repo.listar(perfil.id);
        const preferencias = await obtenerRepositorioPreferencias().obtenerPreferencias(perfil.id);
        const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
        const categorias = preferencias.completed ? preferencias.categories : [];
        const filtradas = filtrarPromociones(catalogo, perfil.tipoTarjeta, categorias);
        return responderJson(seleccionarGuardadasVisibles(filtradas, ids));
      }

      let cuerpo;
      try {
        cuerpo = await request.json();
      } catch {
        return responderJson({ error: 'Formato de datos inválido.' }, 400);
      }
      if (!cuerpo || typeof cuerpo !== 'object') {
        return responderJson({ error: 'Formato de datos inválido.' }, 400);
      }

      // perfil.id sale de la cookie. Si el cuerpo trae otro usuarioId, no se usa.
      if (request.method === 'POST') {
        const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
        const resultado = await guardarPromocion(perfil.id, cuerpo.promocionId, repo, async id => {
          return catalogo.some(promo => promo.id === id);
        });
        return responderJson(resultado);
      }

      return responderJson(await quitarPromocion(perfil.id, cuerpo.promocionId, repo));
    } catch (error) {
      if (error.message.includes('Falta el identificador') || error.message.includes('no encontrada')) {
        return responderJson({ error: error.message }, 400);
      }
      return responderJson({ error: 'No se pudieron actualizar las promociones guardadas.' }, 503);
    }
  }
};
