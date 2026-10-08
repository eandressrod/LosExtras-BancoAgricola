import { obtenerRepositorioAccesos } from '../../backend/repositorios/index.js';
import { iniciarSesion } from '../../backend/servicios/autenticacion.js';
import { crearToken, cookieDeSesion } from '../../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../../backend/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');
    let cuerpo;
    try {
      cuerpo = await request.json();
    } catch {
      return responderJson({ error: 'La solicitud no tiene un formato válido.' }, 400);
    }
    try {
      const resultado = await iniciarSesion(cuerpo, obtenerRepositorioAccesos());
      if (!resultado.ok) return responderJson({ error: resultado.error }, resultado.estado);
      const cookie = cookieDeSesion(crearToken(resultado.perfil.id), request);
      return responderJson({ perfil: resultado.perfil }, 200, { 'Set-Cookie': cookie });
    } catch (error) {
      console.error('Inicio de sesión no disponible:', error.message);
      return responderJson({ error: 'No se pudo iniciar sesión. Intenta de nuevo más tarde.' }, 503);
    }
  }
};
