import { filtrarPromociones, leerBusquedaComercio, filtrarPorComercio } from '../promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioPreferencias, obtenerRepositorioProductosMenu } from '../repositorios/index.js';
import { obtenerRepositorioGuardadas } from '../repositorios/guardadas.js';
import { guardarPromocion, quitarPromocion, seleccionarGuardadasVisibles, aplicaATarjetasPropias } from '../servicios/guardadas.js';
import { perfilDeSesion } from '../servicios/autenticacion.js';
import { tarjetasDelUsuario, elegirTarjeta, rechazoDeTarjeta } from '../servicios/tarjetas.js';
import { leerCookie } from '../servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../http.js';

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'POST' && request.method !== 'DELETE') {
      return metodoNoPermitido('GET, POST, DELETE');
    }

    try {
      const perfil = await perfilDeSesion(leerCookie(request), obtenerRepositorioAccesos());
      if (!perfil) return responderJson({ error: 'Inicia sesión para continuar.' }, 401);

      const repo = obtenerRepositorioGuardadas();

      if (request.method === 'GET') {
        const parametros = new URL(request.url).searchParams;
        const busqueda = leerBusquedaComercio(parametros);
        if (!busqueda.ok) return responderJson({ error: 'Búsqueda por comercio no válida.' }, 400);
        const ids = await repo.listar(perfil.id);
        const preferencias = await obtenerRepositorioPreferencias().obtenerPreferencias(perfil.id);
        const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
        // La misma regla que Promociones: la tarjeta pedida tiene que ser del dueño de la sesión.
        const propias = tarjetasDelUsuario(await obtenerRepositorioProductosMenu().listarTarjetas(perfil.id));
        const eleccion = elegirTarjeta(propias, parametros, perfil.tipoTarjeta);
        if (!eleccion.ok) {
          const { cuerpo, estado } = rechazoDeTarjeta(eleccion);
          return responderJson(cuerpo, estado);
        }
        const categorias = preferencias.completed ? preferencias.categories : [];
        const porTarjeta = eleccion.tarjeta
          ? filtrarPromociones(catalogo, eleccion.tarjeta.tipoTarjeta, [])
          : [];
        const filtradas = eleccion.tarjeta
          ? filtrarPromociones(catalogo, eleccion.tarjeta.tipoTarjeta, categorias)
          : [];
        // H10 y QA-AUD-03: sinCoincidencias distingue entre tarjeta e intereses; la búsqueda solo recorta la lista visible.
        const visibles = seleccionarGuardadasVisibles(filtradas, ids, porTarjeta);
        return responderJson({ ...visibles, promociones: filtrarPorComercio(visibles.promociones, busqueda.comercio) });
      }

      let cuerpo;
      try {
        cuerpo = await request.json();
      } catch {
        return responderJson({ error: 'Formato de datos inválido.' }, 400);
      }
      if (!cuerpo || typeof cuerpo !== 'object') {
        return responderJson({ error: 'Formato de datos inválido.' }, 400);
      }

      // perfil.id sale de la cookie. Si el cuerpo trae otro usuarioId, no se usa.
      if (request.method === 'POST') {
        const [catalogo, tarjetas] = await Promise.all([
          obtenerRepositorio().listarPromocionesConBeneficios(), 
          obtenerRepositorioProductosMenu().listarTarjetas(perfil.id)
        ]);
        const propias = tarjetasDelUsuario(tarjetas, perfil);
        const resultado = await guardarPromocion(perfil.id, cuerpo.promocionId, repo, async id => {
          return aplicaATarjetasPropias(catalogo, propias, id);
        });
        return responderJson(resultado);
      }

      return responderJson(await quitarPromocion(perfil.id, cuerpo.promocionId, repo));
    } catch (error) {
      if (error.message.includes('no encontrada')) {
        return responderJson({ error: error.message }, 404);
      }
      if (error.message.includes('Falta el identificador')) {
        return responderJson({ error: error.message }, 400);
      }
      return responderJson({ error: 'No se pudieron actualizar las promociones guardadas.' }, 503);
    }
  }
};
