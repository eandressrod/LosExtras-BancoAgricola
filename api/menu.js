import { obtenerRepositorioAccesos, obtenerRepositorioCuentas } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');

    try {
      const repoAccesos = obtenerRepositorioAccesos();
      const perfil = await perfilDeSesion(leerCookie(request), repoAccesos);

      if (!perfil) {
        return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      }

      // 1. Obtener cuentas del propietario asegurando aislamiento
      const repoCuentas = obtenerRepositorioCuentas();
      const cuentas = await repoCuentas.listarPorPerfil(perfil.id, perfil.tipoTarjeta);

      // 2. Determinar estado de la encuesta (H3): si tiene preferencias completas
      const encuestaCompletada = Boolean(perfil.preferencias && perfil.preferencias.length > 0);
      const encuestaPendiente = !encuestaCompletada;

      return responderJson({
        perfil,
        cuentas,
        encuestaPendiente,
        destinoPromociones: encuestaPendiente ? '/encuesta.html' : '/promociones.html'
      });
    } catch (error) {
      console.error('Consulta de menú no disponible:', error.message);
      return responderJson({ error: 'No se pudieron cargar los datos del menú. Intenta de nuevo más tarde.' }, 503);
    }
  }
};
