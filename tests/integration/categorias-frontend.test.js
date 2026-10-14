import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('las opciones de encuesta usan IDs y nombres dinámicos, incluidas imágenes y catálogo vacío', async () => {
  function element(tag) { return { tag, children: [], append(...items) { this.children.push(...items); }, replaceChildren(...items) { this.children = items; }, querySelectorAll() { return this.children.flatMap(l => l.children.filter(c => c.tag === 'input')); } }; }
  const contenedor = element('div'); let datos = [{ id:'Salud',nombre:'Salud y bienestar',imagen_url:'/recursos/midi/foto.png' }];
  const source = (await readFile(new URL('../../public/js/categorias.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replace('export async function','async function');
  const context = vm.createContext({ document:{createElement:element,createTextNode:text=>({text})}, getJSON:async()=>datos, contenedor });
  await vm.runInContext(source,context);
  const inputs = await vm.runInContext('cargarCategorias(contenedor)',context);
  assert.equal(inputs[0].value,'Salud');
  assert.equal(contenedor.children[0].children.at(-1).text,'Salud y bienestar');
  assert.equal(contenedor.children[0].children[1].src,'/recursos/midi/foto.png');
  datos=[]; await vm.runInContext('cargarCategorias(contenedor)',context); assert.equal(contenedor.children.length,0);
});
