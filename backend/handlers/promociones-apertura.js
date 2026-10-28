import { obtenerRepositorioAccesos, obtenerRepositorioUsuariosPrueba } from '../repositorios/index.js';
import { perfilDeSesion } from '../servicios/autenticacion.js';
import { leerCookie } from '../servicios/sesion.js';
import { responderJson, metodoNoPermitido } from '../http.js';

// H21 (ADR-010): marcas que el cliente puede pedir guardar junto con la apertura.
const MARCAS_ENCUESTA = ['hoja-mostrada', 'aviso-cerrado'];

/** Sin cuerpo solo registra la apertura; con { marca } guarda además esa marca. Devuelve null si el cuerpo no es válido. */
async function leerMarca(request) {
  const texto = await request.text();
  if (!texto.trim()) return undefined;
  try {
    const { marca } = JSON.parse(texto) ?? {};
    return marca === undefined || MARCAS_ENCUESTA.includes(marca) ? marca : null;
  } catch { return null; }
}

export function crearHandlerApertura(repos = { accesos:obtenerRepositorioAccesos, usuarios:obtenerRepositorioUsuariosPrueba }) {
  return { async fetch(request) {
    if (request.method !== 'POST') return metodoNoPermitido('POST');
    try {
      const perfil = await perfilDeSesion(leerCookie(request), repos.accesos());
      if (!perfil) return responderJson({ error:'Inicia sesión para continuar.' },401);
      const marca = await leerMarca(request);
      if (marca === null) return responderJson({ error:'Marca de encuesta no válida.' },400);
      const estado = await repos.usuarios().marcarApertura(perfil.id, marca);
      if (!estado) return responderJson({ error:'No se encontró el usuario.' },404);
      return responderJson(estado);
    } catch { return responderJson({ error:'No se pudo registrar la apertura de Promociones.' },503); }
  } };
}
export default crearHandlerApertura();
