// H23 (SCRUM-117): correcciones desde la tarjeta mediante /api/senales, pregunta en contexto en /api/preguntas
// y su efecto en /api/para-ti. El propietario sale siempre de la sesión; deshacer = reactivar o desactivar, nunca borrar.
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import recursos from '../../api/recursos.js';
import { reiniciarSenalesMock } from '../../backend/repositorios/senales.mock.js';
import { reiniciarRespuestasMock } from '../../backend/repositorios/respuestas-pregunta.mock.js';
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h23-correcciones-pruebas'.repeat(3);

async function llamar(perfilId, ruta, metodo = 'GET', cuerpo) {
  const respuesta = await recursos.fetch(new Request('http://localhost' + ruta, {
    method: metodo,
    headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), 'content-type': 'application/json' },
    ...(cuerpo !== undefined && { body: JSON.stringify(cuerpo) })
  }));
  return { estado: respuesta.status, datos: await respuesta.json() };
}
const declarar = (perfil, clase, ambito, valor, origen = 'tarjeta') => llamar(perfil, '/api/senales', 'POST', { clase, ambito, valor, origen });
const activas = async perfil => (await llamar(perfil, '/api/senales')).datos.senales;
const paraTi = async (perfil, consulta = '') => (await llamar(perfil, '/api/para-ti' + consulta)).datos;
const ids = respuesta => respuesta.promociones.map(o => o.id);
/** Deshacer como lo hace la pantalla: un PATCH por cada cambio que devolvió la acción. */
async function deshacer(perfil, cambios) {
  for (const cambio of cambios) assert.equal((await llamar(perfil, '/api/senales', 'PATCH', cambio)).estado, 200);
}

beforeEach(() => { reiniciarSenalesMock(); reiniciarRespuestasMock(); });

test('H23 «No me interesa» saca la oferta de Para ti, sigue en la búsqueda y deshacer restaura el orden', async () => {
  await declarar('B', 'interes', 'categoria', 'Restaurantes', 'encuesta');
  const antes = ids(await paraTi('B'));
  assert.ok(antes.includes('starbucks'));
  const accion = await declarar('B', 'rechazo', 'oferta', 'starbucks');
  assert.equal(accion.estado, 200);
  assert.deepEqual(accion.datos.deshacer, [{ id: accion.datos.senal.id, activa: false }]);
  const despues = ids(await paraTi('B'));
  assert.equal(despues.includes('starbucks'), false);
  assert.ok(despues.includes('starbucks-regalo'), 'no retira otras ofertas de su comercio');
  assert.ok(ids(await paraTi('B', '?comercio=starbucks')).includes('starbucks'));
  await deshacer('B', accion.datos.deshacer);
  assert.deepEqual(ids(await paraTi('B')), antes);
});

test('H23 «Menos» de un comercio elegido desactiva su interés y deshacer lo vuelve a elegir', async () => {
  await declarar('B', 'interes', 'categoria', 'Restaurantes', 'encuesta');
  const mas = await declarar('B', 'interes', 'comercio', 'pizza-hut');
  const elegido = (await paraTi('B')).promociones.find(o => o.merchantId === 'pizza-hut');
  assert.equal(elegido.componentes.R, 65);
  const menos = await declarar('B', 'rechazo', 'comercio', 'pizza-hut');
  assert.equal(menos.datos.senal.quitoEleccion, true);
  assert.deepEqual(menos.datos.deshacer, [{ id: menos.datos.senal.id, activa: false }, { id: mas.datos.senal.id, activa: true }]);
  assert.equal((await activas('B')).some(s => s.id === mas.datos.senal.id), false);
  const sinM = (await paraTi('B')).promociones.find(o => o.merchantId === 'pizza-hut');
  assert.deepEqual(sinM.componentes, { C: 1, M: 0, T: 0, R: 20 });
  await deshacer('B', menos.datos.deshacer);
  assert.equal((await paraTi('B')).promociones.find(o => o.merchantId === 'pizza-hut').componentes.R, 65);
});

test('H23 «Menos» de un comercio no elegido multiplica su R por 0.3; «Más» lo retira', async () => {
  await declarar('B', 'interes', 'categoria', 'Restaurantes', 'encuesta');
  const menos = await declarar('B', 'rechazo', 'comercio', 'pollo-campero');
  assert.equal(menos.datos.senal.quitoEleccion ?? false, false);
  assert.equal((await paraTi('B')).promociones.find(o => o.merchantId === 'pollo-campero').componentes.R, 6);
  const mas = await declarar('B', 'interes', 'comercio', 'pollo-campero');
  assert.deepEqual(mas.datos.deshacer, [{ id: mas.datos.senal.id, activa: false }, { id: menos.datos.senal.id, activa: true }]);
  assert.equal((await paraTi('B')).promociones.find(o => o.merchantId === 'pollo-campero').componentes.R, 65);
});

test('H23 repetir una corrección activa no duplica señales ni ofrece un deshacer que borre la anterior', async () => {
  const primera = await declarar('B', 'rechazo', 'oferta', 'starbucks');
  const segunda = await declarar('B', 'rechazo', 'oferta', 'starbucks');
  assert.equal(segunda.datos.senal.id, primera.datos.senal.id);
  assert.deepEqual(segunda.datos.deshacer, []);
  assert.equal((await activas('B')).length, 1);
});

test('H23 excluir categoría la saca de Para ti y un filtro explícito por ella la muestra', async () => {
  await declarar('B', 'interes', 'categoria', 'Restaurantes', 'encuesta');
  await declarar('B', 'interes', 'categoria', 'Compras', 'encuesta');
  await declarar('B', 'rechazo', 'categoria', 'Restaurantes');
  assert.equal((await paraTi('B')).promociones.some(o => o.category === 'Restaurantes'), false);
  const filtrada = await paraTi('B', '?categoria=Restaurantes');
  assert.ok(filtrada.promociones.length > 0);
  assert.ok(filtrada.promociones.every(o => o.category === 'Restaurantes'));
});

test('H23 tras 3 «Menos» en Restaurantes Para ti propone la pregunta; «Sí» la excluye con origen pregunta', async () => {
  await declarar('B', 'interes', 'categoria', 'Restaurantes', 'encuesta');
  for (const comercio of ['restaurante', 'starbucks']) await declarar('B', 'rechazo', 'comercio', comercio);
  assert.equal((await paraTi('B')).pregunta, null);
  await declarar('B', 'rechazo', 'comercio', 'pizza-hut');
  assert.deepEqual((await paraTi('B')).pregunta, { tipo: 'excluir-categoria', categoria: 'Restaurantes', nombre: 'Restaurantes' });
  const si = await llamar('B', '/api/preguntas', 'POST', { pregunta: 'excluir-categoria', valor: 'Restaurantes', respuesta: 'si' });
  assert.equal(si.estado, 200);
  const excluida = (await activas('B')).find(s => s.clase === 'rechazo' && s.ambito === 'categoria');
  assert.equal(excluida.origen, 'pregunta');
  assert.deepEqual(si.datos.deshacer, [{ id: excluida.id, activa: false }]);
  const despues = await paraTi('B');
  assert.equal(despues.pregunta, null);
  assert.equal(despues.promociones.some(o => o.category === 'Restaurantes'), false);
});

test('H23 si se responde «No», la pregunta no vuelve y no se excluye la categoría', async () => {
  for (const comercio of ['restaurante', 'starbucks', 'pizza-hut']) await declarar('B', 'rechazo', 'comercio', comercio);
  const no = await llamar('B', '/api/preguntas', 'POST', { pregunta: 'excluir-categoria', valor: 'Restaurantes', respuesta: 'no' });
  assert.equal(no.estado, 200);
  assert.deepEqual(no.datos.deshacer, []);
  assert.equal((await paraTi('B')).pregunta, null);
  assert.equal((await activas('B')).some(s => s.ambito === 'categoria'), false);
});

test('H23 /api/preguntas valida sesión, método, pregunta, respuesta y categoría', async () => {
  const cuerpo = { pregunta: 'excluir-categoria', valor: 'Restaurantes', respuesta: 'no' };
  assert.equal((await llamar(null, '/api/preguntas', 'POST', cuerpo)).estado, 401);
  assert.equal((await llamar('B', '/api/preguntas', 'GET')).estado, 405);
  for (const malo of [{ ...cuerpo, pregunta: 'zona' }, { ...cuerpo, respuesta: 'ahora-no' }, { ...cuerpo, valor: 'Inventada' }, null]) {
    assert.equal((await llamar('B', '/api/preguntas', 'POST', malo)).estado, 400, JSON.stringify(malo));
  }
});

test('H23 las correcciones de un perfil no afectan a otro', async () => {
  for (const perfil of ['A', 'B']) await declarar(perfil, 'interes', 'categoria', 'Restaurantes', 'encuesta');
  const antesA = ids(await paraTi('A'));
  const accion = await declarar('B', 'rechazo', 'categoria', 'Restaurantes');
  for (const comercio of ['restaurante', 'starbucks', 'pizza-hut']) await declarar('B', 'rechazo', 'comercio', comercio);
  assert.deepEqual(ids(await paraTi('A')), antesA);
  assert.equal((await paraTi('A')).pregunta, null);
  assert.equal((await llamar('A', '/api/senales', 'PATCH', { id: accion.datos.senal.id, activa: false })).estado, 404);
});
