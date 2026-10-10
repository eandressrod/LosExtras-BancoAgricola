import test from 'node:test';
import assert from 'node:assert/strict';
import preferencias from '../../api/preferencias.js';
import login from '../../api/auth/login.js';

process.env.SESSION_SECRET = 'x'.repeat(40);
process.env.DATA_SOURCE = 'mock'; // Usamos el mock que acabamos de crear

const url = (ruta) => `http://localhost${ruta}`;

async function obtenerCookieValida() {
  const res = await login.fetch(new Request(url('/api/auth/login'), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario: 'demo.basica', contrasena: 'Basica2026' })
  }));
  return res.headers.getSetCookie()[0].split(';')[0];
}

test('GET /api/preferencias devuelve 401 sin sesión', async () => {
  const res = await preferencias.fetch(new Request(url('/api/preferencias')));
  assert.equal(res.status, 401);
});

test('POST /api/preferencias rechaza JSON malformado con 400', async () => {
  const cookie = await obtenerCookieValida();
  const res = await preferencias.fetch(new Request(url('/api/preferencias'), {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: '{json-roto'
  }));
  assert.equal(res.status, 400);
});

test('POST /api/preferencias rechaza categorías inválidas con 400', async () => {
  const cookie = await obtenerCookieValida();
  const res = await preferencias.fetch(new Request(url('/api/preferencias'), {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: ['Autos'] })
  }));
  assert.equal(res.status, 400);
});

test('POST y GET /api/preferencias guardan y recuperan datos exitosamente (200)', async () => {
  const cookie = await obtenerCookieValida();
  
  // Guardar
  const resPost = await preferencias.fetch(new Request(url('/api/preferencias'), {
    method: 'POST', headers: { cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: ['Restaurantes', 'Compras'] })
  }));
  assert.equal(resPost.status, 200);

  // Recuperar
  const resGet = await preferencias.fetch(new Request(url('/api/preferencias'), {
    method: 'GET', headers: { cookie }
  }));
  assert.equal(resGet.status, 200);
  const data = await resGet.json();
  assert.equal(data.completed, true);
  assert.deepEqual(data.categories, ['Restaurantes', 'Compras']);
});