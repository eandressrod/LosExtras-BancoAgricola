import { obtenerRepositorioAccesos, obtenerRepositorioCuentas } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';
import { obtenerClienteSupabase } from '../backend/config/supabase.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');

    try {
      const repoAccesos = obtenerRepositorioAccesos();
      const perfil = await perfilDeSesion(leerCookie(request), repoAccesos);

      if (!perfil) {
        return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
      }

      // 1. Cuentas del propietario filtradas estrictamente
      const repoCuentas = obtenerRepositorioCuentas();
      const cuentas = await repoCuentas.listarPorPerfil(perfil.id);

      // 2. Consulta del estado real de encuesta
      let encuestaCompletada = false;
      const fuente = (process.env.DATA_SOURCE || 'mock').toLowerCase();

      if (fuente === 'supabase') {
        try {
          const cliente = obtenerClienteSupabase();
          const { data: prefs } = await cliente
            .from('preferencias_usuario')
            .select('perfil_id')
            .eq('perfil_id', perfil.id);
          encuestaCompletada = Boolean(prefs && prefs.length > 0);
        } catch {
          encuestaCompletada = false;
        }
      } else {
        // En mock: el perfil B / Black tiene preferencias completas de prueba
        const pid = String(perfil.id || '').toUpperCase();
        const tipo = String(perfil.tipoTarjeta || '').toLowerCase();
        encuestaCompletada = pid === 'B' || tipo === 'black';
      }

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
