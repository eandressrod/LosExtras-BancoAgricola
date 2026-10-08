// Hash de contraseñas con scrypt (incluido en Node). Formato: scrypt$<sal>$<clave>.
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const PREFIJO = 'scrypt';
const LONGITUD_CLAVE = 32;

export function generarHash(contrasena) {
  if (typeof contrasena !== 'string' || contrasena === '') {
    throw new TypeError('La contraseña debe ser un texto no vacío.');
  }
  const sal = randomBytes(16);
  const clave = scryptSync(contrasena, sal, LONGITUD_CLAVE);
  return [PREFIJO, sal.toString('base64url'), clave.toString('base64url')].join('$');
}

export function verificarContrasena(contrasena, hash) {
  if (typeof contrasena !== 'string' || typeof hash !== 'string') return false;
  const [prefijo, sal, clave, ...resto] = hash.split('$');
  if (prefijo !== PREFIJO || !sal || !clave || resto.length > 0) return false;
  const esperada = Buffer.from(clave, 'base64url');
  if (esperada.length !== LONGITUD_CLAVE) return false;
  const calculada = scryptSync(contrasena, Buffer.from(sal, 'base64url'), LONGITUD_CLAVE);
  return timingSafeEqual(calculada, esperada);
}
