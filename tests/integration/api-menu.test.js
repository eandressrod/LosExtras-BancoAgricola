import test from 'node:test';
import assert from 'node:assert/strict';
import login from '../../api/auth/login.js';
import menu from '../../api/menu.js';
import * as menuModulo from '../../api/menu.js';
import * as accesos from '../../backend/repositorios/accesos.mock.js';

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

test('menu consulta siempre el dueño de sesión aunque pidan otro usuario en la URL', async () => {
  const { cookie } = await entrar('demo.basica', 'Basica2026');
  const res = await menu.fetch(new Request(url('/api/menu?perfil_id=B'), { headers: { cookie } }));
  const data = await res.json();
  assert.equal(data.perfil.id, 'A');
  assert.ok(data.cuentas.every(c => c.perfilId === 'A'));
});

test('el estado se puede releer al pulsar Promociones sin sustituir una fila pendiente', async () => {
  let completada = false;
  const handler = menuModulo.crearHandlerMenu({
    accesos: () => accesos,
    cuentas: () => ({ async listarPorPerfil() { return []; } }),
    encuesta: () => ({ async estaCompletada() { return completada; } })
  });
  const { cookie } = await entrar('demo.basica', 'Basica2026');
  const request = () => new Request(url('/api/menu'), { headers: { cookie } });
  assert.equal((await (await handler.fetch(request())).json()).destinoPromociones, '/encuesta.html');
  completada = true;
  assert.equal((await (await handler.fetch(request())).json()).destinoPromociones, '/promociones.html');
});

test('error de estado de encuesta devuelve 503 sin destino ni datos anteriores', async () => {
  const handler = menuModulo.crearHandlerMenu({
    accesos: () => accesos,
    cuentas: () => ({ async listarPorPerfil() { return [{ id: 'cuenta-a' }]; } }),
    encuesta: () => ({ async estaCompletada() { throw new Error('detalle privado de base'); } })
  });
  const { cookie } = await entrar('demo.basica', 'Basica2026');
  const res = await handler.fetch(new Request(url('/api/menu'), { headers: { cookie } }));
  assert.equal(res.status, 503);
  assert.deepEqual(Object.keys(await res.json()), ['error']);
});

test('menu rechaza una cookie revocada y métodos no permitidos', async () => {
  const { default: logout } = await import('../../api/auth/logout.js');
  const { cookie } = await entrar('demo.black', 'Black2026');
  await logout.fetch(new Request(url('/api/auth/logout'), { method: 'POST', headers: { cookie } }));
  assert.equal((await menu.fetch(new Request(url('/api/menu'), { headers: { cookie } }))).status, 401);
  const res = await menu.fetch(new Request(url('/api/menu'), { method: 'POST' }));
  assert.equal(res.status, 405);
  assert.equal(res.headers.get('Allow'), 'GET');
});
