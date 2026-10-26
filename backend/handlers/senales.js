// H22: /api/senales. Leer las activas, declarar (crear o reactivar) y desactivar o reactivar por id.
// H23: declarar devuelve también `deshacer`; «Menos» y «Más» de un comercio retiran su señal opuesta.
// El propietario sale siempre de la sesión; los valores deben existir en el catálogo vigente.
import { obtenerRepositorio, obtenerRepositorioAccesos, obtenerRepositorioPreferencias, obtenerRepositorioSenales } from '../repositorios/index.js';
import { validarSenal } from '../../public/js/motor/vocabulario.js';
import { efectosDeDeclarar } from '../../public/js/motor/correcciones.js';
import { exigirPerfil, responderJson, metodoNoPermitido } from '../http.js';

const METODOS = 'GET, POST, PATCH';
const NO_EXISTE = 'El valor de la señal no existe en el catálogo.';

// Error de datos del cliente: se responde 400 con su mensaje. Cualquier otro error es 503 con un mensaje genérico.
class SolicitudInvalida extends Error {}

async function leerCuerpo(request) {
  try { return await request.json(); } catch { throw new SolicitudInvalida('Formato de datos inválido.'); }
}

/** Ids del catálogo vigente contra los que se comprueba cada ámbito; canal, beneficio, descubrir y zona no consultan el catálogo. */
async function existeEnCatalogo({ ambito, valor }, repositorios) {
  if (ambito === 'categoria' || ambito === 'subcategoria') {
    const categorias = await repositorios.preferencias().obtenerCategorias();
    return ambito === 'categoria'
      ? categorias.some(categoria => categoria.id === valor)
      : categorias.some(categoria => (categoria.subcategorias ?? []).some(subcategoria => subcategoria.id === valor));
  }
  if (ambito === 'comercio' || ambito === 'oferta') {
    const promociones = await repositorios.catalogo().listarPromocionesConBeneficios();
    return promociones.some(promo => (ambito === 'oferta' ? promo.id : promo.comercio?.id) === valor);
  }
  return true;
}

/**
 * Declara una señal con los efectos de H23 sobre las demás del mismo dueño y devuelve cómo deshacerla:
 * `deshacer` son los PATCH que la pantalla envía para volver al estado anterior. Repetir una señal activa no cambia nada.
 */
export async function declarar(repo, usuarioId, nueva) {
  const activas = await repo.listarActivas(usuarioId);
  const previa = activas.find(senal => senal.clase === nueva.clase && senal.ambito === nueva.ambito && senal.valor === nueva.valor);
  if (previa) return { senal: previa, deshacer: [] };
  const { desactivar, quitoEleccion } = efectosDeDeclarar(nueva, activas);
  for (const id of desactivar) await repo.cambiarEstado(usuarioId, id, false);
  const senal = await repo.activar(usuarioId, quitoEleccion ? { ...nueva, quitoEleccion } : nueva);
  return { senal, deshacer: [{ id: senal.id, activa: false }, ...desactivar.map(id => ({ id, activa: true }))] };
}

export function crearHandlerSenales(repositorios = {
  accesos: obtenerRepositorioAccesos,
  senales: obtenerRepositorioSenales,
  preferencias: obtenerRepositorioPreferencias,
  catalogo: obtenerRepositorio
}) {
  return { async fetch(request) {
    if (!['GET', 'POST', 'PATCH'].includes(request.method)) return metodoNoPermitido(METODOS);
    try {
      const { perfil, respuesta } = await exigirPerfil(request, repositorios.accesos());
      if (respuesta) return respuesta;
      const repo = repositorios.senales();

      // GET: señales activas del dueño de la sesión.
      if (request.method === 'GET') return responderJson({ senales: await repo.listarActivas(perfil.id) });

      const cuerpo = await leerCuerpo(request);
      // POST: declarar. Una señal igual ya existente se reactiva (clave única por usuario, clase, ámbito y valor).
      if (request.method === 'POST') {
        const { clase, ambito, valor, origen } = cuerpo ?? {};
        const nueva = { clase, ambito, valor, origen };
        const error = validarSenal(nueva);
        if (error) throw new SolicitudInvalida(error);
        if (!await existeEnCatalogo(nueva, repositorios)) throw new SolicitudInvalida(NO_EXISTE);
        return responderJson(await declarar(repo, perfil.id, nueva));
      }

      // PATCH: quitar (activa false) o deshacer (activa true). Una señal de otro perfil responde 404, igual que una inexistente.
      const { id, activa } = cuerpo ?? {};
      if (!Number.isInteger(id) || typeof activa !== 'boolean') throw new SolicitudInvalida('Indica la señal y si queda activa.');
      const senal = await repo.cambiarEstado(perfil.id, id, activa);
      return senal ? responderJson({ senal }) : responderJson({ error: 'Señal no encontrada.' }, 404);
    } catch (error) {
      if (error instanceof SolicitudInvalida) return responderJson({ error: error.message }, 400);
      return responderJson({ error: 'No se pudieron actualizar tus intereses.' }, 503);
    }
  } };
}

export default crearHandlerSenales();
