import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'entrada-recursos-prueba-'.repeat(3);

test('entrada compartida mantiene sesión, métodos y aislamiento de los tres endpoints', async () => {
  const { default: api } = await import('../../api/recursos.js');
  const { default: login } = await import('../../api/auth/login.js');
  const entrar = await login.fetch(new Request('http://local/api/auth/login', { method: 'POST', body: JSON.stringify({ usuario: 'demo.basica', contrasena: 'Basica2026' }) }));
  assert.equal(entrar.status, 200);
  const cookie = entrar.headers.getSetCookie()[0].split(';')[0];
  for (const [recurso, method] of [['mensajes', 'GET'], ['metas', 'GET'], ['promociones-apertura', 'POST']]) {
    const ruta = 'http://local/api/' + recurso;
    assert.equal((await api.fetch(new Request(ruta, { method }))).status, 401);
    assert.equal((await api.fetch(new Request(ruta + '?perfil=B', { method, headers: { cookie } }))).status, 200);
    assert.equal((await api.fetch(new Request(ruta, { method: 'PUT', headers: { cookie } }))).status, 405);
  }
});

test('empaquetado Hobby: doce entradas como máximo y rewrites de los tres recursos', async () => {
  const raiz = new URL('../../', import.meta.url);
  const contar = async carpeta => {
    let total = 0;
    for (const item of await readdir(carpeta, { withFileTypes: true })) {
      total += item.isDirectory() ? await contar(new URL(item.name + '/', carpeta)) : Number(item.name.endsWith('.js'));
    }
    return total;
  };
  assert.ok(await contar(new URL('api/', raiz)) <= 12);
  const config = JSON.parse(await readFile(new URL('vercel.json', raiz), 'utf8'));
  for (const recurso of ['mensajes', 'metas', 'promociones-apertura', 'preguntas']) {
    assert.ok(config.rewrites.some(ruta => ruta.source === '/api/' + recurso && ruta.destination === '/api/recursos?recurso=' + recurso));
  }
});
