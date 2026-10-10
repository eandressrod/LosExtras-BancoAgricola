import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

// Prueba interacción del formulario con las respuestas HTTP, no una copia de su lógica.
const source = async () => (await readFile(new URL('../../public/js/preferencias.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '');
function element() {
  return { hidden: false, disabled: false, textContent: '', attributes: {},
    addEventListener(type, listener) { this[type] = listener; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; }
  };
}
async function page({ categories = ['Compras'], loadFails = false, saveFails = false } = {}) {
  const els = new Map(); const inputs = ['Restaurantes','Compras','Entretenimiento'].map(value => ({ ...element(), value, checked: false }));
  const get = key => { if (!els.has(key)) els.set(key, element()); return els.get(key); };
  const location = { value: '', assign(value) { this.value = value; }, replace(value) { this.value = value; } };
  const state = { loadFails, saveFails }; const requests = [];
  const context = { document: { querySelector: get, querySelectorAll: () => inputs }, location,
    requireSession: async () => ({ id: 'A', tipoTarjeta: 'basica' }),
    getJSON: async () => { if (state.loadFails) throw new Error('Carga fallida'); return { completed: true, categories }; },
    fetch: async (url, options) => { requests.push({ url, options }); return { status: state.saveFails ? 503 : 200, ok: !state.saveFails, json: async () => ({ error: 'Guardado fallido' }) }; }
  };
  await vm.runInNewContext(`(async () => { ${await source()} })()`, context);
  return { get, inputs, state, location, requests };
}
test('H6 precarga las preferencias guardadas y guarda la selección nueva sin mandar propietario', async () => {
  const p = await page();
  assert.deepEqual(p.inputs.filter(i => i.checked).map(i => i.value), ['Compras']);
  p.inputs[0].checked = true; p.inputs[1].checked = false;
  await p.get('#preferences-form').submit({ preventDefault() {} });
  assert.deepEqual(JSON.parse(p.requests[0].options.body), { categorias: ['Restaurantes'] });
  assert.equal(p.location.value, '/promociones.html');
});
test('H6 fallo de carga no habilita una edición vacía; Reintentar recupera', async () => {
  const p = await page({ loadFails: true });
  assert.equal(p.get('#preferences-form').hidden, true);
  assert.equal(p.get('#retry').hidden, false);
  p.state.loadFails = false; await p.get('#retry').click();
  assert.equal(p.get('#preferences-form').hidden, false);
  assert.equal(p.inputs[1].checked, true);
});
test('H6 error de guardado conserva cambios y permite reintentar sin navegar', async () => {
  const p = await page({ saveFails: true }); p.inputs[0].checked = true;
  await p.get('#preferences-form').submit({ preventDefault() {} });
  assert.equal(p.location.value, '');
  assert.equal(p.inputs[0].checked, true);
  assert.equal(p.get('#save-preferences').disabled, false);
  p.state.saveFails = false;
  await p.get('#preferences-form').submit({ preventDefault() {} });
  assert.equal(p.location.value, '/promociones.html');
});
test('H6 selección vacía no guarda ni modifica los datos existentes', async () => {
  const p = await page(); p.inputs.forEach(i => { i.checked = false; });
  await p.get('#preferences-form').submit({ preventDefault() {} });
  assert.equal(p.requests.length, 0);
  assert.equal(p.location.value, '');
  assert.match(p.get('#preferences-error').textContent, /al menos una categoría/);
});
