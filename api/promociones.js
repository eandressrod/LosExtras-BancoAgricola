import { filtrarPromociones, filtrarPorCategoria, leerCategoriaTemporal } from '../backend/promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioCuentas, obtenerRepositorioPreferencias } from '../backend/repositorios/index.js';
import { perfilDeSesion } from '../backend/servicios/autenticacion.js';
import { leerCookie } from '../backend/servicios/sesion.js';
import { tarjetasDelUsuario, elegirTarjeta, rechazoDeTarjeta } from '../backend/servicios/tarjetas.js';
import { responderJson, metodoNoPermitido } from '../backend/http.js';

export function crearHandlerPromociones(repositorios = {
  accesos: obtenerRepositorioAccesos,
  cuentas: obtenerRepositorioCuentas,
  preferencias: obtenerRepositorioPreferencias,
  catalogo: obtenerRepositorio
}) {
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
        const [categorias, cuentas] = await Promise.all([
          repoPreferencias.obtenerCategorias(),
          repositorios.cuentas().listarPorPerfil(perfil.id)
        ]);
        const filtro = leerCategoriaTemporal(parametros, new Set(categorias.map(categoria => categoria.id)));
        if (!filtro.ok) return responderJson({ error: 'Categoría no válida.' }, 400);
        // H16: los beneficios son los de la tarjeta elegida, siempre que sea del dueño de la sesión.
        const eleccion = elegirTarjeta(tarjetasDelUsuario(cuentas, perfil), parametros, perfil.tipoTarjeta);
        if (!eleccion.ok) {
          const { cuerpo, estado } = rechazoDeTarjeta(eleccion);
          return responderJson(cuerpo, estado);
        }
        if (!eleccion.tarjeta) return responderJson([]);
        const [preferencias, catalogo] = await Promise.all([
          repoPreferencias.obtenerPreferencias(perfil.id),
          repositorios.catalogo().listarPromocionesConBeneficios()
        ]);
        const aplicables = filtrarPromociones(catalogo, eleccion.tarjeta.tipoTarjeta, preferencias.completed ? preferencias.categories : []);
        // H5: la categoría elegida solo restringe lo que ya aplica; nunca agrega ofertas.
        return responderJson(filtrarPorCategoria(aplicables, filtro.categoria));
      } catch {
        return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
      }
    }
  };
}

export default crearHandlerPromociones();
