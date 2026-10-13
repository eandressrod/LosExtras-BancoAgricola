import test from 'node:test';
import assert from 'node:assert/strict';
import { crearServidorMidi } from '../../hola/servidor.js';
import { crearServicioMidi } from '../../hola/servicio.js';
import { generarPerfil, crearBorrador } from '../../hola/modelo.js';

async function entorno(t) {
  let llamadas = 0;
  const servicio = crearServicioMidi({ rpc: async () => { llamadas++; return { data: { perfiles: [{ id: 'A', _conteos: { cuentas: 2 }, _dependencias: 'firma' }] }, error: null }; } });
  const server = crearServidorMidi({ servicio, destino: 'ejemplo.supabase.co' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = `http://127.0.0.1:${server.address().port}`;
  const config = await (await fetch(url + '/api/config')).json();
  return { url, headers: { 'X-Midi-Token': config.token, Origin: url }, llamadas: () => llamadas };
}
test('servidor sirve solo la UI, sin env, código privado ni secretos', async t => {
  const e = await entorno(t);
  const pagina = await fetch(e.url + '/');
  assert.equal(pagina.status, 200);
  assert.match(pagina.headers.get('content-security-policy'), /default-src 'self'/);
  for (const ruta of ['/.env','/servicio.js','/../backend/config/supabase.js','/api/no-existe']) assert.equal((await fetch(e.url + ruta)).status, 404);
  assert.ok(!(await pagina.text()).includes('SUPABASE_SECRET_KEY'));
});
test('datos, conexión y dependencias comparten una sola lectura y rechazan otros orígenes', async t => {
  const e = await entorno(t);
  assert.equal((await fetch(e.url + '/api/datos')).status, 403);
  assert.equal((await fetch(e.url + '/api/datos', { headers: { ...e.headers, Origin: 'https://ajeno.test' } })).status, 403);
  for (const ruta of ['/api/datos','/api/conexion','/api/dependencias?tabla=perfiles&id=A']) assert.equal((await fetch(e.url + ruta, { headers: e.headers })).status, 200);
  assert.equal(e.llamadas(), 1);
  assert.equal((await fetch(e.url + '/api/datos', { method: 'POST', headers: e.headers })).status, 405);
});
test('POST guarda un lote deduplicado y controla JSON inválido', async t => {
  const e = await entorno(t); const b = crearBorrador(); b.agregar(generarPerfil(() => 0));
  const opciones = { method: 'POST', headers: { ...e.headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ peticion: 'http-test', cambios: b.cambios() }) };
  assert.equal((await fetch(e.url + '/api/guardar', opciones)).status, 200);
  assert.equal((await fetch(e.url + '/api/guardar', opciones)).status, 200);
  assert.equal(e.llamadas(), 1);
  assert.equal((await fetch(e.url + '/api/guardar', { ...opciones, body: '{' })).status, 400);
  assert.equal((await fetch(e.url + '/api/guardar', { ...opciones, headers: { ...opciones.headers, Origin: 'https://ajeno.test' } })).status, 403);
});
