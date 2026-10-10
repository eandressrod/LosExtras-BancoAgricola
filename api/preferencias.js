import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { validarYGuardarPreferencias } from '../backend/servicios/preferencias.js';
import { obtenerRepositorioAccesos, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

// Endpoint para guardar las categorías de interés del usuario autenticado (H3).
// Solo acepta POST; la identidad del propietario siempre proviene del token de sesión.
export default {
  async fetch(request) {
    if (request.method !== 'POST' && request.method !== 'GET') {
      return metodoNoPermitido('GET, POST');
    }
    
    try {
      const repoAccesos = obtenerRepositorioAccesos();
      const perfil = await perfilDeSesion(leerCookie(request), repoAccesos);
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);

      const repoPreferencias = obtenerRepositorioPreferencias();

      // Si es GET, devolvemos las preferencias guardadas
      if (request.method === 'GET') {
        const preferencias = await repoPreferencias.obtenerPreferencias(perfil.id);
        return responderJson(preferencias);
      }

      // Si es POST, guardamos las preferencias
      const cuerpo = await request.json();
      await validarYGuardarPreferencias(perfil.id, cuerpo.categorias, repoPreferencias);
      
      return responderJson({ ok: true });

    } catch (error) {
      if (error.message.includes('categoría') || error.message.includes('Selecciona')) {
         return responderJson({ error: error.message }, 400);
      }
      return responderJson({ error: 'Servicio no disponible.' }, 503);
    }
  }
}