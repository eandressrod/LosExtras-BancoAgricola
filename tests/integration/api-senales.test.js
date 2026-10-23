// H22: API del registro de señales. El propietario sale siempre de la sesión; quitar = desactivar, deshacer = reactivar.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import recursos from '../../api/recursos.js';
import { reiniciarSenalesMock } from '../../backend/repositorios/senales.mock.js';
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h22-senales-pruebas'.repeat(3);

const pedir = (perfilId, metodo = 'GET', cuerpo) => new Request('http://localhost/api/senales', {
  method: metodo,
  headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), 'content-type': 'application/json' },
  ...(cuerpo !== undefined && { body: typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo) })
});
const enviar = async (...argumentos) => {
  const respuesta = await recursos.fetch(pedir(...argumentos));
  return { estado: respuesta.status, datos: await respuesta.json(), cache: respuesta.headers.get('cache-control') };
};
const senal = cambios => ({ clase: 'interes', ambito: 'comercio', valor: 'cine', origen: 'encuesta', ...cambios });

beforeEach(() => reiniciarSenalesMock());

test('H22 sin sesión responde 401 y los métodos no previstos 405', async () => {
  assert.equal((await enviar(null)).estado, 401);
  for (const metodo of ['POST', 'PATCH']) assert.equal((await enviar(null, metodo, senal())).estado, 401, metodo);
  const borrar = await recursos.fetch(pedir('A', 'DELETE'));
  assert.equal(borrar.status, 405);
  assert.equal(borrar.headers.get('allow'), 'GET, POST, PATCH');
});

test('H22 crear, leer, desactivar y reactivar una señal propia', async () => {
  const creada = await enviar('A', 'POST', senal());
  assert.equal(creada.estado, 200);
  assert.equal(creada.cache, 'no-store');
  const { id } = creada.datos.senal;
  assert.deepEqual({ ...creada.datos.senal, id: 0, creadaEn: '' }, { id: 0, ...senal(), creadaEn: '', activa: true });
  assert.deepEqual((await enviar('A')).datos.senales.map(s => s.id), [id]);
  const quitada = await enviar('A', 'PATCH', { id, activa: false });
  assert.equal(quitada.estado, 200);
  assert.equal(quitada.datos.senal.activa, false);
  assert.deepEqual((await enviar('A')).datos.senales, []);
  const deshecha = await enviar('A', 'PATCH', { id, activa: true });
  assert.equal(deshecha.datos.senal.id, id);
  assert.equal((await enviar('A')).datos.senales.length, 1);
});

test('H22 el propietario es el de la sesión, aunque el cuerpo diga otro', async () => {
  const { datos } = await enviar('A', 'POST', { ...senal(), usuarioId: 'B', usuario_id: 'B' });
  assert.equal((await enviar('A')).datos.senales.length, 1);
  assert.deepEqual((await enviar('B')).datos.senales, []);
  assert.equal((await enviar('B', 'PATCH', { id: datos.senal.id, activa: false })).estado, 404);
  assert.equal((await enviar('A')).datos.senales.length, 1);
});

test('H22 se rechazan señales fuera del vocabulario o que no existen en el catálogo', async () => {
  const casos = [
    [senal({ clase: 'puntaje' }), /clase/],
    [senal({ ambito: 'canal' }), /ámbito/],
    [senal({ origen: 'impresion' }), /origen/],
    [senal({ clase: 'criterio', ambito: 'canal', valor: 'tienda' }), /valor/],
    [senal({ valor: 'comercio-inventado' }), /catálogo/],
    [senal({ ambito: 'categoria', valor: 'Mascotas' }), /catálogo/],
    [senal({ ambito: 'subcategoria', valor: 'no-existe' }), /catálogo/],
    [senal({ clase: 'rechazo', ambito: 'oferta', valor: 'oferta-inventada' }), /catálogo/]
  ];
  for (const [cuerpo, mensaje] of casos) {
    const { estado, datos } = await enviar('A', 'POST', cuerpo);
    assert.equal(estado, 400, JSON.stringify(cuerpo));
    assert.match(datos.error, mensaje);
  }
  for (const valida of [senal({ ambito: 'categoria', valor: 'Salud' }), senal({ clase: 'rechazo', ambito: 'oferta', valor: 'cine' }),
    senal({ clase: 'criterio', ambito: 'beneficio', valor: 'indiferente' }), senal({ clase: 'criterio', ambito: 'zona', valor: 'santa-tecla' })]) {
    assert.equal((await enviar('A', 'POST', valida)).estado, 200, JSON.stringify(valida));
  }
  const subcategoria = (await enviar('A', 'POST', senal({ ambito: 'subcategoria', valor: 'farmacias' })));
  assert.equal(subcategoria.estado, 200, JSON.stringify(subcategoria.datos));
});

test('H22 un cuerpo mal formado responde 400', async () => {
  assert.equal((await enviar('A', 'POST', '{no es json')).estado, 400);
  for (const cuerpo of [{ id: 'uno', activa: false }, { id: 1, activa: 'no' }, { id: 1.5, activa: true }, {}]) {
    assert.equal((await enviar('A', 'PATCH', cuerpo)).estado, 400, JSON.stringify(cuerpo));
  }
});

test('H22 /api/senales y /api/para-ti entran por la función compartida en Vercel y en el servidor local', async () => {
  const raiz = new URL('../../', import.meta.url);
  const config = JSON.parse(await readFile(new URL('vercel.json', raiz), 'utf8'));
  const servidor = await readFile(new URL('scripts/dev.js', raiz), 'utf8');
  for (const recurso of ['senales', 'para-ti']) {
    assert.ok(config.rewrites.some(ruta => ruta.source === '/api/' + recurso && ruta.destination === '/api/recursos?recurso=' + recurso), recurso);
    assert.ok(servidor.includes(`'/api/${recurso}': recursos`), recurso);
  }
});
