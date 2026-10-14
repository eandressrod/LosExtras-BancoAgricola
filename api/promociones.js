import { filtrarPromociones, filtrarPorCategoria, leerCategoriaTemporal } from '../backend/promociones.js';
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
      const repoPreferencias = obtenerRepositorioPreferencias();
      const vigentes = new Set((await repoPreferencias.obtenerCategorias()).map(categoria => categoria.id));
      const filtro = leerCategoriaTemporal(new URL(request.url).searchParams, vigentes);
      if (!filtro.ok) return responderJson({ error: 'Categoría no válida.' }, 400);
      const [preferencias, catalogo] = await Promise.all([
        repoPreferencias.obtenerPreferencias(perfil.id),
        obtenerRepositorio().listarPromocionesConBeneficios()
      ]);
      const aplicables = filtrarPromociones(catalogo, perfil.tipoTarjeta, preferencias.completed ? preferencias.categories : []);
      // H5: la categoría elegida solo restringe lo que ya aplica; nunca agrega ofertas.
      return responderJson(filtrarPorCategoria(aplicables, filtro.categoria));
    } catch {
      return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
    }
  }
};
