// H22 y H25: GET /api/para-ti. El motor ordena las promociones de la tarjeta elegida con las señales del dueño de la sesión
// y la intención temporal del día («Hoy busco»). La instantánea vive en el navegador: el servidor no guarda órdenes ni puntajes.
import { filtrarPromociones } from '../promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioPreferencias, obtenerRepositorioProductosMenu,
  obtenerRepositorioSenales } from '../repositorios/index.js';
import { leerConsultaPromociones } from '../servicios/consulta-promociones.js';
import { ordenarParaTi, leerIntencionTemporal, reglaIntencion } from '../../public/js/motor/index.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../http.js';

/**
 * Fábrica del handler; las pruebas inyectan repositorios y reloj.
 * Recorrido: sesión → consulta (filtros, intención y tarjeta propia) → señales y catálogo → elegibilidad por tarjeta → motor.
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
      const parametros = new URL(request.url).searchParams;
      const intencion = leerIntencionTemporal(parametros);
      if (!intencion.ok) return responderJson({ error: 'Intención del día no válida.' }, 400);
      const [categorias, propias] = await Promise.all([
        repositorios.preferencias().obtenerCategorias(),
        repositorios.tarjetas().listarTarjetas(perfil.id)
      ]);
      const consulta = leerConsultaPromociones(parametros, categorias, propias, perfil);
      if (!consulta.ok) return responderJson(consulta.cuerpo, consulta.estado);
      // Perfil sin tarjeta: el motor responde su sobre vacío ('sin-catalogo') sin consultar más.
      if (!consulta.tarjeta) return responderJson(ordenarParaTi());
      const [senales, catalogo] = await Promise.all([
        repositorios.senales().listarActivas(perfil.id),
        repositorios.catalogo().listarPromocionesConBeneficios()
      ]);
      const ahora = reloj();
      // Las preferencias no filtran aquí: el motor decide el alcance y el orden a partir de las señales y la intención del día.
      const ofertas = filtrarPromociones(catalogo, consulta.tarjeta.tipoTarjeta, [], ahora);
      const reglas = intencion.intencion ? { intencion: reglaIntencion(intencion.intencion) } : {};
      return responderJson(ordenarParaTi({ ofertas, senales, filtros: consulta.filtros, reglas }));
    } catch {
      return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
    }
  } };
}

export default crearHandlerParaTi();
