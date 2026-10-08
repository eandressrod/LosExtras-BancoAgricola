import test from 'node:test';
import assert from 'node:assert/strict';
import { crearToken, verificarToken, leerCookie } from '../../backend/servicios/sesion.js';

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
