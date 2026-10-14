import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { crearAlmacenImagenes } from '../../hola/imagenes.js';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1sAAAAASUVORK5CYII=', 'base64');
const archivo = { ruta: `/recursos/midi/${createHash('sha256').update(png).digest('hex')}.png`, contenido: png.toString('base64') };
const cambio = { tabla: 'promociones', operacion: 'crear', datos: { imagen_url: archivo.ruta } };
test('imagen se escribe solo al guardar, con ruta estable; repetir no duplica archivos', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'midi-img-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const almacen = crearAlmacenImagenes(dir);
  assert.deepEqual(await readdir(dir), []);
  await almacen.guardar([cambio], [archivo]);
  await almacen.guardar([cambio], [archivo]);
  assert.deepEqual(await readFile(join(dir, archivo.ruta.split('/').at(-1))), png);
  assert.equal((await readdir(dir)).length, 1);
});
test('rechaza rutas ajenas, contenido falso y archivos sin referencia o asociados a perfiles', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'midi-img-')); t.after(() => rm(dir, { recursive: true, force: true }));
  const almacen = crearAlmacenImagenes(dir);
  for (const archivos of [[{ ...archivo, ruta: '../fuera.png' }], [{ ...archivo, contenido: Buffer.from('<script>').toString('base64') }]]) {
    await assert.rejects(almacen.guardar([cambio], archivos), /imagen|ruta|archivo/i);
  }
  await assert.rejects(almacen.guardar([], [archivo]), /referencia|imagen/i);
  await assert.rejects(almacen.guardar([{ tabla: 'perfiles', datos: { imagen_url: archivo.ruta } }], [archivo]), /referencia|imagen/i);
  assert.deepEqual(await readdir(dir), []);
});
