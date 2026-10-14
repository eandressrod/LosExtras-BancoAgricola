import test from 'node:test';
import assert from 'node:assert/strict';
import categorias from '../../api/categorias.js';
import login from '../../api/auth/login.js';
process.env.SESSION_SECRET = 'c'.repeat(40); process.env.DATA_SOURCE = 'mock';
test('categorías requieren sesión y solo aceptan GET', async () => {
  assert.equal((await categorias.fetch(new Request('http://localhost/api/categorias'))).status, 401);
  assert.equal((await categorias.fetch(new Request('http://localhost/api/categorias', { method: 'POST' }))).status, 405);
});
test('devuelve categorías para construir la encuesta sin datos privados', async () => {
  const acceso = await login.fetch(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: 'demo.basica', contrasena: 'Basica2026' }) }));
  const cookie = acceso.headers.getSetCookie()[0].split(';')[0];
  const res = await categorias.fetch(new Request('http://localhost/api/categorias', { headers: { cookie } }));
  assert.equal(res.status, 200);
  assert.deepEqual((await res.json()).map(c => c.id).sort(), ['Compras','Entretenimiento','Restaurantes']);
});
