import { filtrarPromociones, filtrarPorCategoria, leerCategoriaTemporal, leerDisponibleHoy, filtrarDisponiblesHoy, leerBusquedaComercio, filtrarPorComercio } from '../backend/promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioProductosMenu, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { tarjetasDelUsuario, elegirTarjeta, rechazoDeTarjeta } from '../backend/servicios/tarjetas.js';
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
        const filtro = leerCategoriaTemporal(parametros, new Set(categorias.map(categoria => categoria.id)));
        if (!filtro.ok) return responderJson({ error: 'Categoría no válida.' }, 400);
        const disponibilidad = leerDisponibleHoy(parametros);
        if (!disponibilidad.ok) return responderJson({ error: 'Filtro de disponibilidad no válido.' }, 400);
        const busqueda = leerBusquedaComercio(parametros);
        if (!busqueda.ok) return responderJson({ error: 'Búsqueda por comercio no válida.' }, 400);
        // H16: los beneficios son los de la tarjeta elegida, siempre que sea del dueño de la sesión.
        const eleccion = elegirTarjeta(tarjetasDelUsuario(propias, perfil), parametros, perfil.tipoTarjeta);
        if (!eleccion.ok) {
          const { cuerpo, estado } = rechazoDeTarjeta(eleccion);
          return responderJson(cuerpo, estado);
        }
        if (!eleccion.tarjeta) return responderJson([]);
        const [preferencias, catalogo] = await Promise.all([
          repoPreferencias.obtenerPreferencias(perfil.id),
          repositorios.catalogo().listarPromocionesConBeneficios()
        ]);
        const aplicables = filtrarPromociones(catalogo, eleccion.tarjeta.tipoTarjeta, preferencias.completed ? preferencias.categories : [], reloj());
        // H5, H17 y H10: la categoría, Disponibles hoy y la búsqueda por comercio solo restringen lo que ya aplica.
        const porCategoria = filtrarPorCategoria(aplicables, filtro.categoria);
        const porHoy = filtrarDisponiblesHoy(porCategoria, disponibilidad.hoy);
        return responderJson(filtrarPorComercio(porHoy, busqueda.comercio));
      } catch {
        return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
      }
    }
  };
}

export default crearHandlerPromociones();