import { listarPromociones } from '../backend/promociones.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return Response.json({ error: 'Método no permitido.' }, { status: 405, headers: { Allow: 'GET' } });
    }
    try {
      return Response.json(await listarPromociones());
    } catch {
      return Response.json({ error: 'No se pudieron cargar las promociones.' }, { status: 503 });
    }
  }
};
