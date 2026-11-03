import { obtenerRepositorioAccesos, obtenerRepositorioProductosMenu } from '../backend/repositorios/index.js';
import { tarjetasDelUsuario, elegirTarjeta } from '../backend/servicios/tarjetas.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../backend/http.js';

// H16: tarjetas propias del dueño de la sesión; la identidad nunca sale de la consulta.
export function crearHandlerTarjetas(repositorios = { accesos: obtenerRepositorioAccesos, tarjetas: obtenerRepositorioProductosMenu }) {
  return {
    async fetch(request) {
      if (request.method !== 'GET') return metodoNoPermitido('GET');
      try {
        const { perfil, respuesta } = await exigirPerfil(request, repositorios.accesos());
        if (respuesta) return respuesta;
        const tarjetas = tarjetasDelUsuario(await repositorios.tarjetas().listarTarjetas(perfil.id), perfil);
        const porDefecto = elegirTarjeta(tarjetas, new URLSearchParams(), perfil.tipoTarjeta).tarjeta;
        return responderJson(tarjetas.map(tarjeta => ({ ...tarjeta, predeterminada: tarjeta === porDefecto })));
      } catch {
        return responderJson({ error: 'No se pudieron cargar tus tarjetas.' }, 503);
      }
    }
  };
}

export default crearHandlerTarjetas();
