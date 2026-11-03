import test from 'node:test';
import assert from 'node:assert/strict';
import { conEspera } from '../../public/js/espera-carga.js';

// SCRUM-144: una carga que tarda avisa a los 8 s y se corta a los 20 s con el error de siempre, para poder reintentar.
function reloj() {
  let ahora = 0;
  let siguiente = 0;
  const pendientes = new Map();
  return {
    pendientes,
    setTimeout(fn, ms) { pendientes.set(++siguiente, { fn, vence: ahora + ms }); return siguiente; },
    clearTimeout(id) { pendientes.delete(id); },
    avanzar(ms) {
      ahora += ms;
      for (const [id, tarea] of [...pendientes]) if (tarea.vence <= ahora) { pendientes.delete(id); tarea.fn(); }
    }
  };
}

test('a los 8 s avisa que tarda y sigue esperando la respuesta', async () => {
  const r = reloj();
  const avisos = [];
  let responder;
  const carga = conEspera(() => new Promise(resolver => { responder = resolver; }), { alTardar: texto => avisos.push(texto), reloj: r });
  await Promise.resolve();
  r.avanzar(7999);
  assert.deepEqual(avisos, []);
  r.avanzar(1);
  assert.deepEqual(avisos, ['Está tardando más de lo normal…']);
  responder('lista');
  assert.equal(await carga, 'lista');
  assert.equal(r.pendientes.size, 0, 'al responder no quedan temporizadores');
});

test('a los 20 s cancela la petición y responde el error de carga', async () => {
  const r = reloj();
  let senal;
  const carga = conEspera(recibida => { senal = recibida; return new Promise(() => {}); }, { reloj: r });
  await Promise.resolve();
  r.avanzar(19999);
  assert.equal(senal.aborted, false);
  r.avanzar(1);
  assert.equal(senal.aborted, true);
  await assert.rejects(carga, { message: 'No se pudieron cargar los datos. Intenta de nuevo.' });
});

test('una respuesta rápida no avisa y un fallo propio conserva su mensaje', async () => {
  const r = reloj();
  const avisos = [];
  assert.equal(await conEspera(async () => 'lista', { alTardar: texto => avisos.push(texto), reloj: r }), 'lista');
  await assert.rejects(conEspera(async () => { throw new Error('Sin conexión'); }, { reloj: r }), { message: 'Sin conexión' });
  r.avanzar(20000);
  assert.deepEqual(avisos, []);
});
