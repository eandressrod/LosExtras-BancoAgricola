// H22: GET /api/para-ti. El motor ordena las promociones de la tarjeta elegida con las señales del dueño de la sesión.
// La instantánea vive en el navegador: el servidor no guarda órdenes, puntajes ni impresiones.
import { filtrarPromociones } from '../promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioPreferencias, obtenerRepositorioProductosMenu,
  obtenerRepositorioSenales } from '../repositorios/index.js';
import { leerConsultaPromociones } from '../servicios/consulta-promociones.js';
import { ordenarParaTi } from '../../public/js/motor/index.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../http.js';

/**
 * Fábrica del handler; las pruebas inyectan repositorios y reloj.
 * Recorrido: sesión → consulta (filtros y tarjeta propia) → señales y catálogo → elegibilidad por tarjeta → motor.
 */
export function crearHandlerParaTi(repositorios = {
  accesos: obtenerRepositorioAccesos,
  tarjetas: obtenerRepositorioProductosMenu,
  preferencias: obtenerRepositorioPreferencias,
  catalogo: obtenerRepositorio,
  senales: obtenerRepositorioSenales
}, reloj = () => new Date()) {
  return { async fetch(request) {
    if (request.method !== 'GET') return metodoNoPermitido('GET');
    try {
      const { perfil, respuesta } = await exigirPerfil(request, repositorios.accesos());
      if (respuesta) return respuesta;
      const [categorias, propias] = await Promise.all([
        repositorios.preferencias().obtenerCategorias(),
        repositorios.tarjetas().listarTarjetas(perfil.id)
      ]);
      const consulta = leerConsultaPromociones(new URL(request.url).searchParams, categorias, propias, perfil);
      if (!consulta.ok) return responderJson(consulta.cuerpo, consulta.estado);
      // Perfil sin tarjeta: el motor responde su sobre vacío ('sin-catalogo') sin consultar más.
      if (!consulta.tarjeta) return responderJson(ordenarParaTi());
      const [senales, catalogo] = await Promise.all([
        repositorios.senales().listarActivas(perfil.id),
        repositorios.catalogo().listarPromocionesConBeneficios()
      ]);
      const ahora = reloj();
      // Las preferencias no filtran aquí: el motor decide el alcance y el orden a partir de las señales.
      const ofertas = filtrarPromociones(catalogo, consulta.tarjeta.tipoTarjeta, [], ahora);
      return responderJson(ordenarParaTi({ ofertas, senales, filtros: consulta.filtros }));
    } catch {
      return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
    }
  } };
}

export default crearHandlerParaTi();
