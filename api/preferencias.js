import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { validarYGuardarPreferencias } from '../backend/servicios/preferencias.js';
import { obtenerRepositorioAccesos, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

// Endpoint para guardar las categorías de interés del usuario autenticado (H3).
// Solo acepta POST; la identidad del propietario siempre proviene del token de sesión.
export default {
  async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');

    try {
      // 1. Verificar sesión activa.
      const perfil = await perfilDeSesion(leerCookie(request), obtenerRepositorioAccesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);

      // 2. Leer categorías del cuerpo de la petición.
      const { categorias } = await request.json();

      // 3. Validar y persistir usando el ID del propietario de la sesión (nunca del cliente).
      await validarYGuardarPreferencias(perfil.id, categorias, obtenerRepositorioPreferencias());

      // 4. Confirmar éxito solo cuando la API haya persistido correctamente.
      return responderJson({ ok: true });
    } catch (error) {
      // Errores de validación del dominio → 400 Bad Request.
      if (
        error.message === 'Selecciona al menos una categoría' ||
        error.message === 'Categoría inválida'
      ) {
        return responderJson({ error: error.message }, 400);
      }

      // Cualquier otro fallo (Supabase, red, etc.) → 503 para que el cliente pueda reintentar.
      console.error('Error al guardar preferencias:', error.message);
      return responderJson({ error: 'No se pudieron guardar las preferencias. Intenta de nuevo.' }, 503);
    }
  }
};

