// Sesión sin estado: cookie HttpOnly con { pid, exp } firmado con HMAC-SHA256.
// Solo el backend conoce SESSION_SECRET; un identificador escrito a mano no autentica.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const NOMBRE_COOKIE = 'sesion_extras';
export const DURACION_SESION_SEGUNDOS = 2 * 60 * 60;
const LONGITUD_MINIMA_SECRETO = 32;
const HOSTS_LOCALES = ['localhost', '127.0.0.1', '[::1]'];

function leerSecreto() {
  const secreto = process.env.SESSION_SECRET;
  if (!secreto || secreto.length < LONGITUD_MINIMA_SECRETO) {
    throw new Error(`Falta configurar SESSION_SECRET con al menos ${LONGITUD_MINIMA_SECRETO} caracteres en el backend.`);
  }
  return secreto;
}

function firmar(cuerpo) {
  return createHmac('sha256', leerSecreto()).update(cuerpo).digest('base64url');
}

function mismaFirma(recibida, esperada) {
  const a = Buffer.from(recibida);
  const b = Buffer.from(esperada);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function crearToken(perfilId, ahora = Date.now()) {
  const exp = Math.floor(ahora / 1000) + DURACION_SESION_SEGUNDOS;
  const cuerpo = Buffer.from(JSON.stringify({ pid: perfilId, exp })).toString('base64url');
  return `${cuerpo}.${firmar(cuerpo)}`;
}

/** Devuelve el id del perfil si el token es auténtico y vigente; si no, null. */
export function verificarToken(token, ahora = Date.now()) {
  if (typeof token !== 'string') return null;
  const [cuerpo, firma, ...resto] = token.split('.');
  if (!cuerpo || !firma || resto.length > 0) return null;
  if (!mismaFirma(firma, firmar(cuerpo))) return null;
  try {
    const { pid, exp } = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    return typeof pid === 'string' && Number.isInteger(exp) && exp * 1000 > ahora ? pid : null;
  } catch {
    return null;
  }
}

export function leerCookie(request) {
  for (const par of (request.headers.get('cookie') ?? '').split(';')) {
    const separador = par.indexOf('=');
    if (separador > 0 && par.slice(0, separador).trim() === NOMBRE_COOKIE) {
      return par.slice(separador + 1).trim() || null;
    }
  }
  return null;
}

function atributos(request, maxAge) {
  const local = HOSTS_LOCALES.includes(new URL(request.url).hostname);
  return `; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${local ? '' : '; Secure'}`;
}

export function cookieDeSesion(token, request) {
  return `${NOMBRE_COOKIE}=${token}${atributos(request, DURACION_SESION_SEGUNDOS)}`;
}

export function cookieVencida(request) {
  return `${NOMBRE_COOKIE}=${atributos(request, 0)}`;
}
