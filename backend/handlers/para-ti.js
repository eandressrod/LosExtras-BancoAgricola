// H22 y H25: GET /api/para-ti. El motor ordena las promociones de la tarjeta elegida, o de todas las propias sin ?tarjeta= (SCRUM-133),
// con las señales del dueño de la sesión y la intención temporal del día («Hoy busco»).
// La instantánea vive en el navegador: el servidor no guarda órdenes, puntajes ni impresiones.
import { filtrarPromociones } from '../promociones.js';
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioPreferencias, obtenerRepositorioProductosMenu,
  obtenerRepositorioSenales, obtenerRepositorioRespuestasPregunta } from '../repositorios/index.js';
import { leerConsultaPromociones } from '../servicios/consulta-promociones.js';
import { ordenarParaTi, leerIntencionTemporal, reglaIntencion } from '../../public/js/motor/index.js';
import { reglasCorrecciones, preguntaPendiente, PREGUNTA_EXCLUIR_CATEGORIA } from '../../public/js/motor/correcciones.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../http.js';

/** H23: «¿Dejamos de mostrarte {categoría}?» tras 3 «Menos» en sus comercios, o null. Una vez por visita lo decide la pantalla. */
function preguntaDeContexto(senales, catalogo, categorias, respuestas, ahora) {
  const categoriaDeComercio = new Map(catalogo.filter(promo => promo.comercio?.id).map(promo => [promo.comercio.id, promo.category]));
  const categoria = preguntaPendiente(senales, categoriaDeComercio, respuestas, ahora);
  if (!categoria) return null;
  const nombre = categorias.find(item => item.id === categoria)?.nombre ?? categoria;
  return { tipo: PREGUNTA_EXCLUIR_CATEGORIA, categoria, nombre };
}

/**
 * Fábrica del handler; las pruebas inyectan repositorios y reloj.
 * Recorrido: sesión → consulta (filtros, intención y tarjeta propia) → señales y catálogo → elegibilidad por tarjeta → motor.
 */
export function crearHandlerParaTi(repositorios = {
  accesos: obtenerRepositorioAccesos,
  tarjetas: obtenerRepositorioProductosMenu,
  preferencias: obtenerRepositorioPreferencias,
  catalogo: obtenerRepositorio,
  senales: obtenerRepositorioSenales,
  respuestas: obtenerRepositorioRespuestasPregunta
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
      if (!consulta.tarjeta) return responderJson({ ...ordenarParaTi(), pregunta: null });
      const [senales, catalogo, respuestas] = await Promise.all([
        repositorios.senales().listarActivas(perfil.id),
        repositorios.catalogo().listarPromocionesConBeneficios(),
        repositorios.respuestas().listar(perfil.id)
      ]);
      const ahora = reloj();
      // SCRUM-133: sin ?tarjeta= compiten todas las tarjetas propias (del repositorio, nunca del cliente);
      // con ella, solo la elegida, como antes.
      const alcance = consulta.todas ? { tarjetas: consulta.tarjetas, predeterminadaId: consulta.tarjeta.id } : consulta.tarjeta.tipoTarjeta;
      // Las preferencias no filtran aquí: el motor decide el alcance y el orden a partir de las señales y la intención del día.
      const ofertas = filtrarPromociones(catalogo, alcance, [], ahora);
      // H23: los rechazos se aplican según los filtros de esta consulta; H25 aporta la intención del día.
      const reglas = { ...reglasCorrecciones(consulta.filtros), ...(intencion.intencion && { intencion: reglaIntencion(intencion.intencion) }) };
      return responderJson({ ...ordenarParaTi({ ofertas, senales, filtros: consulta.filtros, reglas }),
        pregunta: preguntaDeContexto(senales, catalogo, categorias, respuestas, ahora) });
    } catch {
      return responderJson({ error: 'No se pudieron cargar las promociones.' }, 503);
    }
  } };
}

export default crearHandlerParaTi();
