// H23: /api/preguntas. Respuesta a la pregunta en contexto «¿Dejamos de mostrarte {categoría}?».
// «Sí» excluye la categoría (rechazo·categoría con origen pregunta); «No» solo guarda la fecha para no repetirla en 30 días.
// «Ahora no» no llega al servidor: la pantalla la retira de esa visita.
import { obtenerRepositorioAccesos, obtenerRepositorioPreferencias, obtenerRepositorioRespuestasPregunta,
  obtenerRepositorioSenales } from '../repositorios/index.js';
import { PREGUNTA_EXCLUIR_CATEGORIA } from '../../public/js/motor/correcciones.js';
import { declarar } from './senales.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../http.js';

const RESPUESTAS = ['si', 'no'];

export function crearHandlerPreguntas(repositorios = {
  accesos: obtenerRepositorioAccesos,
  senales: obtenerRepositorioSenales,
  preferencias: obtenerRepositorioPreferencias,
  respuestas: obtenerRepositorioRespuestasPregunta
}) {
  return { async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');
    try {
      const { perfil, respuesta: sinSesion } = await exigirPerfil(request, repositorios.accesos());
      if (sinSesion) return sinSesion;
      let cuerpo;
      try { cuerpo = await request.json(); } catch { return responderJson({ error: 'Formato de datos inválido.' }, 400); }
      const { pregunta, valor, respuesta } = cuerpo ?? {};
      if (pregunta !== PREGUNTA_EXCLUIR_CATEGORIA || !RESPUESTAS.includes(respuesta) || typeof valor !== 'string') {
        return responderJson({ error: 'Respuesta no válida.' }, 400);
      }
      const categorias = await repositorios.preferencias().obtenerCategorias();
      if (!categorias.some(categoria => categoria.id === valor)) return responderJson({ error: 'Categoría no válida.' }, 400);
      await repositorios.respuestas().guardar(perfil.id, { pregunta, valor, respuesta });
      if (respuesta === 'no') return responderJson({ deshacer: [] });
      const { senal, deshacer } = await declarar(repositorios.senales(), perfil.id,
        { clase: 'rechazo', ambito: 'categoria', valor, origen: 'pregunta' });
      return responderJson({ senal, deshacer });
    } catch {
      return responderJson({ error: 'No se pudo guardar tu respuesta.' }, 503);
    }
  } };
}

export default crearHandlerPreguntas();
