import test from 'node:test';
import assert from 'node:assert/strict';
import { iniciarSesion, perfilDeSesion } from '../../backend/servicios/autenticacion.js';
import { crearToken } from '../../backend/servicios/sesion.js';
import * as repo from '../../backend/repositorios/accesos.mock.js';

test('credenciales de A devuelven perfil básica sin hash', async () => {
  const r = await iniciarSesion({ usuario: 'demo.basica', contrasena: 'Basica2026' }, repo);
  assert.equal(r.ok, true);
  assert.equal(r.perfil.tipoTarjeta, 'basica');
  assert.equal('contrasenaHash' in r.perfil, false);
});
test('credenciales de B devuelven perfil Black', async () => {
  assert.equal((await iniciarSesion({ usuario: 'demo.black', contrasena: 'Black2026' }, repo)).perfil.tipoTarjeta, 'black');
});
test('el usuario general demo/demo123 se conserva con tarjeta básica', async () => {
  const r = await iniciarSesion({ usuario: 'demo', contrasena: 'demo123' }, repo);
  assert.equal(r.ok, true);
  assert.deepEqual(r.perfil, { id: 'demo', nombre: 'Usuario', tipoTarjeta: 'basica' });
});
test('contraseña errónea y usuario inexistente dan el mismo error 401', async () => {
  const a = await iniciarSesion({ usuario: 'demo.black', contrasena: 'mala' }, repo);
  const b = await iniciarSesion({ usuario: 'nadie', contrasena: 'mala' }, repo);
  assert.equal(a.estado, 401);
  assert.deepEqual(a, b);
});
test('campos vacíos o de tipo incorrecto dan 400', async () => {
  for (const cuerpo of [{}, { usuario: '', contrasena: 'x' }, { usuario: 'x', contrasena: '' }, { usuario: 1, contrasena: 2 }]) {
    assert.equal((await iniciarSesion(cuerpo, repo)).estado, 400);
  }
});
test('el usuario ignora espacios y mayúsculas; la contraseña no', async () => {
  assert.equal((await iniciarSesion({ usuario: '  Demo.Basica ', contrasena: 'Basica2026' }, repo)).ok, true);
  assert.equal((await iniciarSesion({ usuario: 'demo.basica', contrasena: 'basica2026' }, repo)).estado, 401);
});
test('cuerpo ausente o entradas demasiado largas dan 400 sin consultar el repositorio', async () => {
  const repoQueNoDebeUsarse = { buscarAccesoPorUsuario: () => assert.fail('no debe consultar') };
  for (const cuerpo of [null, 'texto', { usuario: 'x'.repeat(101), contrasena: 'x' }, { usuario: 'x', contrasena: 'x'.repeat(101) }]) {
    assert.equal((await iniciarSesion(cuerpo, repoQueNoDebeUsarse)).estado, 400);
  }
});
test('el perfil de la sesión se obtiene solo de un token válido', async () => {
  process.env.SESSION_SECRET = 'x'.repeat(40);
  assert.deepEqual(await perfilDeSesion(crearToken('B'), repo), { id: 'B', nombre: 'Usuario B', tipoTarjeta: 'black' });
  assert.equal(await perfilDeSesion('B', repo), null);
  assert.equal(await perfilDeSesion(null, repo), null);
});
