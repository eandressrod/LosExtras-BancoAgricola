import test from 'node:test';
import assert from 'node:assert/strict';
import login from '../../api/auth/login.js';
import menu from '../../api/menu.js';

process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.DATA_SOURCE = 'mock';

const url = (ruta) => `http://localhost${ruta}`;

async function entrar(usuario, contrasena) {
  const res = await login.fetch(new Request(url('/api/auth/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, contrasena }),
  }));
  return { res, cookie: res.headers.getSetCookie()[0]?.split(';')[0] };
}

test('H2 TDD: menu sin cookie de sesion responde 401', async () => {
  const res = await menu.fetch(new Request(url('/api/menu')));
  assert.equal(res.status, 401);
});

test('H2 TDD: menu con sesion devuelve datos y cuentas propias del perfil', async () => {
  const { cookie } = await entrar('demo.black', 'Black2026');
  const res = await menu.fetch(new Request(url('/api/menu'), {
    headers: { cookie }
  }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.perfil);
  assert.equal(data.perfil.tipoTarjeta, 'black');
  assert.ok(Array.isArray(data.cuentas));
  assert.ok(data.cuentas.length > 0);
  const cuenta = data.cuentas[0];
  assert.ok(cuenta.nombre);
  assert.ok(cuenta.numeroEnmascarado);
  assert.ok(cuenta.saldo !== undefined);
  assert.ok(cuenta.moneda);
});
