// Acceso simulado con perfiles fijos de prueba; no es autenticación bancaria.
import { randomUUID } from 'node:crypto';
import { generarHash, verificarContrasena } from './contrasenas.js';
import { datosDeToken } from './sesion.js';

const LONGITUD_MAXIMA = 100;
const ERROR_CAMPOS = 'Escribe tu usuario y tu clave.';
// Mismo mensaje para usuario inexistente y clave errónea: no revela qué dato falló.
const ERROR_CREDENCIALES = 'Usuario o clave incorrectos. Revisa los usuarios de prueba.';

let hashDeReferencia;

const textoValido = valor =>
  typeof valor === 'string' && valor.trim() !== '' && valor.length <= LONGITUD_MAXIMA;

/**
 * @param {unknown} cuerpo Datos enviados por el formulario: { usuario, contrasena }.
 * @param {import('../repositorios/contrato.js').RepositorioAccesos} repo
 */
export async function iniciarSesion(cuerpo, repo) {
  const { usuario, contrasena } = cuerpo !== null && typeof cuerpo === 'object' ? cuerpo : {};
  if (!textoValido(usuario) || !textoValido(contrasena)) {
    return { ok: false, estado: 400, error: ERROR_CAMPOS };
  }
  const acceso = await repo.buscarAccesoPorUsuario(usuario.trim().toLowerCase());
  // Sin usuario se verifica igual contra un hash de referencia: el tiempo de respuesta no lo delata.
  const hash = acceso ? acceso.contrasenaHash : (hashDeReferencia ??= generarHash(randomUUID()));
  if (!verificarContrasena(contrasena, hash) || !acceso) {
    return { ok: false, estado: 401, error: ERROR_CREDENCIALES };
  }
  return { ok: true, perfil: { id: acceso.id, nombre: acceso.nombre, tipoTarjeta: acceso.tipoTarjeta } };
}

/**
 * Perfil dueño de la sesión, o null si el token no es válido o el perfil ya no existe.
 * @param {string | null} token
 * @param {import('../repositorios/contrato.js').RepositorioAccesos} repo
 */
export async function perfilDeSesion(token, repo) {
  const sesion = datosDeToken(token);
  if (!sesion || await repo.sesionRevocada(sesion.id)) return null;
  return repo.buscarPerfilPorId(sesion.perfilId);
}

/** Revoca solo la sesión actual. Un fallo del repositorio impide anunciar su cierre. */
export async function cerrarSesion(token, repo) {
  const sesion = datosDeToken(token);
  if (sesion) await repo.revocarSesion(sesion);
}
