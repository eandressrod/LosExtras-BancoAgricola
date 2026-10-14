import test from 'node:test';
import assert from 'node:assert/strict';
import { crearServidorMidi } from '../../hola/servidor.js';
import { crearServicioMidi } from '../../hola/servicio.js';
import { generarPerfil, crearBorrador } from '../../hola/modelo.js';
import { crearAlmacenImagenes } from '../../hola/imagenes.js';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

async function entorno(t, { publicDir, imagenes } = {}) {
  let llamadas = 0;
  const servicio = crearServicioMidi({ rpc: async () => { llamadas++; return { data: { perfiles: [{ id: 'A', _conteos: { cuentas: 2 }, _dependencias: 'firma' }] }, error: null }; } }, { imagenes });
  const server = crearServidorMidi({ servicio, destino: 'ejemplo.supabase.co', publicDir });
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

test('guardar imagen valida origen/token y publica el archivo sin otra petición a Supabase', async t => {
  const dir = await mkdtemp(join(tmpdir(),'midi-http-')); t.after(() => rm(dir,{ recursive:true,force:true }));
  const e = await entorno(t,{ publicDir:dir, imagenes:crearAlmacenImagenes(join(dir,'recursos','midi')) });
  const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=','base64');
  const ruta = `/recursos/midi/${createHash('sha256').update(bytes).digest('hex')}.png`;
  const cambios = [{ tabla:'comercios',operacion:'crear',clave:{id:'imagen'},datos:{id:'imagen',nombre:'Con imagen',logo_url:ruta} }];
  const request = { method:'POST',headers:{...e.headers,'Content-Type':'application/json'},body:JSON.stringify({ peticion:'imagen',cambios,archivos:[{ruta,contenido:bytes.toString('base64')}] }) };
  assert.equal((await fetch(e.url+'/api/guardar',{...request,headers:{'Content-Type':'application/json',Origin:e.url}})).status,403);
  assert.equal((await fetch(e.url+'/api/guardar',request)).status,200);
  assert.equal((await fetch(e.url+'/api/guardar',request)).status,200);
  assert.equal(e.llamadas(),1);
  assert.deepEqual(await readFile(join(dir,'recursos','midi',ruta.split('/').at(-1))),bytes);
  const res = await fetch(e.url+ruta); assert.equal(res.status,200); assert.equal(res.headers.get('content-type'),'image/png');
  assert.deepEqual(Buffer.from(await res.arrayBuffer()),bytes);
  assert.equal((await fetch(e.url+'/recursos/%2e%2e%2f%2e%2e%2f.env')).status,404);
});

test('iconos del árbol se sirven como PNG locales sin consultar Supabase', async t => {
  const e = await entorno(t);
  for (const icono of ['computer_icon','folder_icon','string_icon']) {
    const respuesta = await fetch(`${e.url}/recursos/${icono}.png`);
    assert.equal(respuesta.status,200);
    assert.equal(respuesta.headers.get('content-type'),'image/png');
    assert.deepEqual([...new Uint8Array(await respuesta.arrayBuffer()).slice(0,8)],[137,80,78,71,13,10,26,10]);
  }
  assert.equal(e.llamadas(),0);
  assert.equal((await fetch(e.url+'/recursos/servicio.js')).status,404);
  assert.equal((await fetch(e.url+'/recursos/regedit_icon.png')).status,404);
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
