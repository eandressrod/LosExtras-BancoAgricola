import test from 'node:test';
import assert from 'node:assert/strict';
import { iniciarSesion } from '../../backend/servicios/autenticacion.js';
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
