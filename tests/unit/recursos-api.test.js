import test from 'node:test';
import assert from 'node:assert/strict';

test('entrada compartida conserva ruta, método, query y cuerpo del handler existente', async () => {
  const { crearHandlerRecursos } = await import('../../api/recursos.js');
  for (const nombre of ['mensajes', 'metas', 'promociones-apertura']) {
    let recibida;
    const api = crearHandlerRecursos({ [nombre]: { async fetch(request) { recibida = request; return new Response('ok'); } } });
    for (const ruta of ['/api/' + nombre + '?perfil=B', '/api/recursos?recurso=' + nombre]) {
      const request = new Request('https://local' + ruta, { method: 'POST', body: '{"id":"propio"}' });
      assert.equal((await api.fetch(request)).status, 200);
      assert.equal(recibida, request);
    }
  }
});

test('ruta pública determina el handler y una query no permite elegir otro', async () => {
  const { crearHandlerRecursos } = await import('../../api/recursos.js');
  const api = crearHandlerRecursos({ mensajes: { fetch: () => new Response('mensajes') }, metas: { fetch: () => new Response('metas') } });
  assert.equal(await (await api.fetch(new Request('https://local/api/mensajes?recurso=metas'))).text(), 'mensajes');
  for (const ruta of ['/api/desconocido?recurso=metas', '/api/recursos', '/api/recursos?recurso=toString']) {
    assert.equal((await api.fetch(new Request('https://local' + ruta))).status, 404);
  }
});
