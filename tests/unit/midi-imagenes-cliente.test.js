import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararImagen, configurarArrastre } from '../../hola/imagenes-cliente.js';

test('soltar archivo evita navegar fuera de Midi y entrega la imagen al mismo flujo de selección', async () => {
  const handlers = {}, clases = new Set(); let recibida, detenido = 0;
  const zona = { addEventListener: (n, f) => { handlers[n] = f; }, classList: { add: c => clases.add(c), remove: c => clases.delete(c) } };
  configurarArrastre(zona, file => { recibida = file; });
  const file = { name: 'foto.png' }, evento = { preventDefault() { detenido++; }, dataTransfer: { files: [file] } };
  handlers.dragover(evento); assert.ok(clases.has('arrastrando'));
  handlers.drop(evento); assert.equal(detenido,2); assert.equal(recibida,file); assert.equal(clases.size,0);
});
test('la imagen del navegador tiene ruta por contenido, permite vista previa y rechaza tipos/tamaños inválidos', async () => {
  const file = new File([new Uint8Array([137,80,78,71])], 'foto.png', {type:'image/png'});
  const a = await prepararImagen(file), b = await prepararImagen(file);
  assert.equal(a.ruta,b.ruta); assert.match(a.ruta,/^\/recursos\/midi\/[a-f0-9]{64}\.png$/);
  assert.ok(a.vista.startsWith('blob:')); URL.revokeObjectURL(a.vista); URL.revokeObjectURL(b.vista);
  await assert.rejects(prepararImagen({type:'image/svg+xml',size:20}),/PNG/);
  await assert.rejects(prepararImagen({type:'image/png',size:2097153}),/2 MB/);
});
