import { listarPerfiles } from '../backend/perfiles.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return Response.json({ error: 'Método no permitido.' }, { status: 405, headers: { Allow: 'GET' } });
    }
    try {
      return Response.json(await listarPerfiles());
    } catch {
      return Response.json({ error: 'No se pudieron cargar los perfiles.' }, { status: 503 });
    }
  }
};
