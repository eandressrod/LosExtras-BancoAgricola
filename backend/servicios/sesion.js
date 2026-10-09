// Cookie HttpOnly con { sid, pid, exp } firmado con HMAC-SHA256.
// La autenticación también consulta las revocaciones persistidas en el repositorio.
// Solo el backend conoce SESSION_SECRET; un identificador escrito a mano no autentica.
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

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
  const cuerpo = Buffer.from(JSON.stringify({ sid: randomUUID(), pid: perfilId, exp })).toString('base64url');
  return `${cuerpo}.${firmar(cuerpo)}`;
}

/** Verifica firma y vigencia; la revocación se consulta aparte en el repositorio. */
export function datosDeToken(token, ahora = Date.now()) {
  if (typeof token !== 'string') return null;
  const [cuerpo, firma, ...resto] = token.split('.');
  if (!cuerpo || !firma || resto.length > 0) return null;
  if (!mismaFirma(firma, firmar(cuerpo))) return null;
  try {
    const { sid, pid, exp } = JSON.parse(Buffer.from(cuerpo, 'base64url').toString('utf8'));
    const idValido = typeof sid === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sid);
    return idValido && typeof pid === 'string' && pid !== '' && Number.isSafeInteger(exp) && exp * 1000 > ahora
      ? { id: sid, perfilId: pid, expiraEn: exp } : null;
  } catch {
    return null;
  }
}

/** Solo valida el token: para autorizar usar perfilDeSesion, que comprueba revocación. */
export function verificarToken(token, ahora = Date.now()) {
  return datosDeToken(token, ahora)?.perfilId ?? null;
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
