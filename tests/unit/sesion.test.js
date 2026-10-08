import test from 'node:test';
import assert from 'node:assert/strict';
import { crearToken, verificarToken, leerCookie, cookieDeSesion, cookieVencida, DURACION_SESION_SEGUNDOS } from '../../backend/servicios/sesion.js';

process.env.SESSION_SECRET = 'x'.repeat(40);

test('un token válido devuelve el id del perfil', () => {
  assert.equal(verificarToken(crearToken('perfil-a')), 'perfil-a');
});
test('un token manipulado es rechazado', () => {
  const [cuerpo, firma] = crearToken('perfil-a').split('.');
  const falso = Buffer.from(JSON.stringify({ pid: 'perfil-b', exp: 9999999999 })).toString('base64url');
  assert.equal(verificarToken(`${falso}.${firma}`), null);
  assert.equal(verificarToken(`${cuerpo}.firmafalsa`), null);
});
test('un token vencido es rechazado', () => {
  assert.equal(verificarToken(crearToken('perfil-a', Date.now() - 3 * 60 * 60 * 1000)), null);
});
test('un identificador a mano no autentica', () => {
  assert.equal(verificarToken('perfil-a'), null);
  assert.equal(verificarToken(undefined), null);
});
test('leerCookie extrae la cookie de sesión', () => {
  const con = new Request('http://x', { headers: { cookie: 'a=1; sesion_extras=abc.def' } });
  assert.equal(leerCookie(con), 'abc.def');
  assert.equal(leerCookie(new Request('http://x')), null);
});

test('la cookie dura lo mismo que el token, es HttpOnly/SameSite y Secure fuera de local', () => {
  const local = cookieDeSesion('abc.def', new Request('http://localhost/api/auth/login'));
  assert.match(local, /^sesion_extras=abc\.def; /);
  for (const atributo of ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${DURACION_SESION_SEGUNDOS}`]) {
    assert.ok(local.includes(atributo), atributo);
  }
  assert.ok(!local.includes('Secure'));
  assert.match(cookieDeSesion('abc.def', new Request('https://project-ovx0k.vercel.app/api/auth/login')), /; Secure/);
  assert.match(cookieVencida(new Request('https://project-ovx0k.vercel.app/api/auth/logout')), /^sesion_extras=; .*Max-Age=0/);
});

test('sin SESSION_SECRET de al menos 32 caracteres no se firman ni verifican sesiones', () => {
  const anterior = process.env.SESSION_SECRET;
  const token = crearToken('perfil-a');
  try {
    for (const valor of [undefined, 'corta']) {
      if (valor === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = valor;
      assert.throws(() => crearToken('perfil-a'), /SESSION_SECRET/);
      assert.throws(() => verificarToken(token), /SESSION_SECRET/);
    }
  } finally { process.env.SESSION_SECRET = anterior; }
});
