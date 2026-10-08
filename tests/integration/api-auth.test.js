import test from 'node:test';
import assert from 'node:assert/strict';
import login from '../../api/auth/login.js';
import sesion from '../../api/auth/sesion.js';
import logout from '../../api/auth/logout.js';

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
const consultarSesion = (cookie) =>
  sesion.fetch(new Request(url('/api/auth/sesion'), { headers: cookie ? { cookie } : {} }));

test('login válido: 200, cookie HttpOnly e identidad del perfil', async () => {
  const { res } = await entrar('demo.black', 'Black2026');
  assert.equal(res.status, 200);
  assert.match(res.headers.getSetCookie()[0], /HttpOnly/);
  assert.equal((await res.json()).perfil.tipoTarjeta, 'black');
});

test('login inválido: 401 con mensaje claro y sin cookie', async () => {
  const { res } = await entrar('demo.black', 'mala');
  assert.equal(res.status, 401);
  assert.ok((await res.json()).error.length > 0);
  assert.equal(res.headers.getSetCookie().length, 0);
});

test('login con cuerpo inválido: 400', async () => {
  const res = await login.fetch(new Request(url('/api/auth/login'), { method: 'POST', body: '{no-json' }));
  assert.equal(res.status, 400);
});

test('métodos no soportados: 405 con header Allow', async () => {
  const casos = [[login, '/api/auth/login', 'GET', 'POST'], [sesion, '/api/auth/sesion', 'POST', 'GET'], [logout, '/api/auth/logout', 'GET', 'POST']];
  for (const [handler, ruta, metodo, permitido] of casos) {
    const res = await handler.fetch(new Request(url(ruta), { method: metodo }));
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('Allow'), permitido);
  }
});

test('sesión con cookie válida devuelve el perfil dueño', async () => {
  const { cookie } = await entrar('demo.basica', 'Basica2026');
  const res = await consultarSesion(cookie);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).perfil.tipoTarjeta, 'basica');
});

test('sesión sin cookie o con identificador a mano: 401', async () => {
  for (const cookie of [undefined, 'sesion_extras=perfil-b', 'sesion_extras=a.b']) {
    assert.equal((await consultarSesion(cookie)).status, 401);
  }
});

test('cerrar sesión borra la cookie y permite entrar con el otro perfil', async () => {
  await entrar('demo.basica', 'Basica2026');
  const out = await logout.fetch(new Request(url('/api/auth/logout'), { method: 'POST' }));
  assert.match(out.headers.getSetCookie()[0], /Max-Age=0/);

  const { cookie } = await entrar('demo.black', 'Black2026');
  assert.equal((await (await consultarSesion(cookie)).json()).perfil.tipoTarjeta, 'black');
});

test('fuente de datos inválida: 503 controlado, sin sustituirla por mock', async () => {
  process.env.DATA_SOURCE = 'invalida';
  try {
    const { res } = await entrar('demo.black', 'Black2026');
    assert.equal(res.status, 503);
    assert.deepEqual(Object.keys(await res.json()), ['error']);
    assert.equal(res.headers.getSetCookie().length, 0);
    assert.equal((await consultarSesion('sesion_extras=x.y')).status, 503);
  } finally { process.env.DATA_SOURCE = 'mock'; }
});
