import mensajes from '../backend/handlers/mensajes.js';
import metas from '../backend/handlers/metas.js';
import apertura from '../backend/handlers/promociones-apertura.js';
import guardadas from '../backend/handlers/guardadas.js';
import paraTi from '../backend/handlers/para-ti.js';
import senales from '../backend/handlers/senales.js';
import { responderJson } from '../backend/http.js';

// Una entrada de Vercel para varias rutas, conservando sus handlers y contratos.
export function crearHandlerRecursos(rutas = { mensajes, metas, 'promociones-apertura': apertura, guardadas, 'para-ti': paraTi, senales }) {
  return { async fetch(request) {
    const url = new URL(request.url);
    const recurso = url.pathname === '/api/recursos'
      ? url.searchParams.get('recurso')
      : url.pathname.startsWith('/api/') ? url.pathname.slice(5) : null;
    if (!recurso || !Object.hasOwn(rutas, recurso)) return responderJson({ error: 'Recurso no encontrado.' }, 404);
    return rutas[recurso].fetch(request);
  } };
}

export default crearHandlerRecursos();
