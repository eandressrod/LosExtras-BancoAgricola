import { filtrarPromociones } from '../backend/promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioProductosMenu, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { leerConsultaPromociones } from '../backend/servicios/consulta-promociones.js';
import { aplicarFiltros } from '../public/js/motor/filtros.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export function crearHandlerPromociones(repositorios = {
  accesos: obtenerRepositorioAccesos,
  tarjetas: obtenerRepositorioProductosMenu,
  preferencias: obtenerRepositorioPreferencias,
  catalogo: obtenerRepositorio
}, reloj = () => new Date()) {
  return {
    async fetch(request) {
      if (request.method !== 'GET') {
        return metodoNoPermitido('GET');
      }
      try {
        const perfil = await perfilDeSesion(leerCookie(request), repositorios.accesos());
        if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);
        const parametros = new URL(request.url).searchParams;
        const repoPreferencias = repositorios.preferencias();
        const [categorias, propias] = await Promise.all([
          repoPreferencias.obtenerCategorias(),
          repositorios.tarjetas().listarTarjetas(perfil.id)
        ]);
        const consulta = leerConsultaPromociones(parametros, categorias, propias, perfil);
        if (!consulta.ok) return responderJson(consulta.cuerpo, consulta.estado);
        if (!consulta.tarjeta) return responderJson([]);
        const [preferencias, catalogo] = await Promise.all([
          repoPreferencias.obtenerPreferencias(perfil.id),
          repositorios.catalogo().listarPromocionesConBeneficios()
        ]);
        const aplicables = filtrarPromociones(catalogo, consulta.tarjeta.tipoTarjeta, preferencias.completed ? preferencias.categories : [], reloj());
        // H5, H17 y H10: la categoría, Disponibles hoy y la búsqueda por comercio solo restringen lo que ya aplica.
        return responderJson(aplicarFiltros(aplicables, consulta.filtros));
      } catch {
        return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
      }
    }
  };
}

export default crearHandlerPromociones();
