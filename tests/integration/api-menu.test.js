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

test('H2 TDD: menu sin cookie responde 401', async () => {
  const res = await menu.fetch(new Request(url('/api/menu')));
  assert.equal(res.status, 401);
});

test('H2 TDD: usuario B recibe sus cuentas Black y destino a Para Ti si tiene encuesta completa', async () => {
  const { cookie } = await entrar('demo.black', 'Black2026');
  const res = await menu.fetch(new Request(url('/api/menu'), { headers: { cookie } }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.perfil.tipoTarjeta, 'black');
  assert.equal(data.cuentas.length, 2);
  assert.ok(data.cuentas.every(c => c.segmento === 'Black'));
  assert.equal(data.destinoPromociones, '/promociones.html');
});

test('H2 TDD: usuario demo recibe cuentas Basica y destino a encuesta por estar pendiente', async () => {
  const { cookie } = await entrar('demo', 'demo123');
  const res = await menu.fetch(new Request(url('/api/menu'), { headers: { cookie } }));
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.ok(data.cuentas.every(c => c.segmento === 'Básica'));
  assert.equal(data.destinoPromociones, '/encuesta.html');
});
