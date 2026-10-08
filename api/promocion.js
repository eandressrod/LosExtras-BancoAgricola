import { buscarPromocion } from '../backend/promociones.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') {
      return Response.json({ error: 'Método no permitido.' }, { status: 405, headers: { Allow: 'GET' } });
    }
    const id = new URL(request.url).searchParams.get('id');
    if (!id) return Response.json({ error: 'Falta el identificador de la promoción.' }, { status: 400 });
    try {
      const promocion = await buscarPromocion(id);
      if (!promocion) return Response.json({ error: 'Promoción no encontrada.' }, { status: 404 });
      return Response.json(promocion);
    } catch {
      return Response.json({ error: 'No se pudo cargar la promoción.' }, { status: 503 });
    }
  }
};
