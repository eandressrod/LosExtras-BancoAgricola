import { cookieVencida } from '../../backend/servicios/sesion.js';
import { responderSinContenido, metodoNoPermitido } from '../../backend/http.js';

// Borra la cookie: el siguiente login puede usar otro perfil sin heredar identidad.
export default {
  async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');
    return responderSinContenido({ 'Set-Cookie': cookieVencida(request) });
  }
};
