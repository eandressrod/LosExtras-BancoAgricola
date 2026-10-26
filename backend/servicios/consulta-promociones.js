// Consulta de Para ti compartida por /api/promociones y /api/para-ti: filtros explícitos (H5, H17, H10) y tarjeta elegida (H16).
import { leerCategoriaTemporal, leerDisponibleHoy, leerBusquedaComercio } from '../promociones.js';
import { tarjetasDelUsuario, elegirTarjeta, rechazoDeTarjeta } from './tarjetas.js';

const rechazo = (estado, error) => ({ ok: false, estado, cuerpo: { error } });

/**
 * @param {URLSearchParams} parametros
 * @param {Array<{id: string}>} categorias vigentes del catálogo
 * @param {object[]} propias tarjetas del dueño de la sesión
 * @param {import('../repositorios/contrato.js').PerfilSesion} perfil
 * @returns {{ ok: true, filtros: import('../../public/js/motor/contrato.js').FiltrosExplicitos, tarjeta: object | null }
 *   | { ok: false, estado: number, cuerpo: { error: string } }}
 */
export function leerConsultaPromociones(parametros, categorias, propias, perfil) {
  // Cada parámetro inválido detiene la consulta con 400; ninguno se corrige ni se ignora en silencio.
  const filtro = leerCategoriaTemporal(parametros, new Set(categorias.map(categoria => categoria.id)));
  if (!filtro.ok) return rechazo(400, 'Categoría no válida.');
  const disponibilidad = leerDisponibleHoy(parametros);
  if (!disponibilidad.ok) return rechazo(400, 'Filtro de disponibilidad no válido.');
  const busqueda = leerBusquedaComercio(parametros);
  if (!busqueda.ok) return rechazo(400, 'Búsqueda por comercio no válida.');
  // H16: los beneficios son los de la tarjeta elegida, siempre que sea del dueño de la sesión.
  const eleccion = elegirTarjeta(tarjetasDelUsuario(propias, perfil), parametros, perfil.tipoTarjeta);
  if (!eleccion.ok) {
    const { cuerpo, estado } = rechazoDeTarjeta(eleccion);
    return { ok: false, estado, cuerpo };
  }
  return { ok: true, filtros: { categoria: filtro.categoria, hoy: disponibilidad.hoy, comercio: busqueda.comercio }, tarjeta: eleccion.tarjeta };
}
