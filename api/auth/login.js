import { obtenerRepositorioAccesos } from '../../backend/repositorios/index.js';
import { iniciarSesion, estadoDeSesion } from '../../backend/servicios/autenticacion.js';
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
      const token = crearToken(resultado.perfil.id);
      const estado = await estadoDeSesion(token, obtenerRepositorioAccesos(), true);
      if (!estado) throw new Error('No se pudo registrar la sesión.');
      const cookie = cookieDeSesion(token, request);
      return responderJson(estado, 200, { 'Set-Cookie': cookie });
    } catch (error) {
      console.error('Inicio de sesión no disponible:', error.message);
      return responderJson({ error: 'No se pudo iniciar sesión. Intenta de nuevo más tarde.' }, 503);
    }
  }
};
