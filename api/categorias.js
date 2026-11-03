import { obtenerRepositorioAccesos, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../backend/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');
    try {
      const { respuesta } = await exigirPerfil(request, obtenerRepositorioAccesos());
      if (respuesta) return respuesta;
      return responderJson(await obtenerRepositorioPreferencias().obtenerCategorias());
    } catch { return responderJson({ error: 'No se pudieron cargar las categorías.' }, 503); }
  }
};
