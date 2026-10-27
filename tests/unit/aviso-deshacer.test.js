import test from 'node:test';
import assert from 'node:assert/strict';
import { crearAviso } from '../../public/js/aviso-deshacer.js';

function nodo() {
  return {
    hidden: true, textContent: '', listeners: {},
    addEventListener(tipo, accion) { this.listeners[tipo] = accion; },
    emitir(tipo) { return this.listeners[tipo]?.({}); }
  };
}

function preparar(duracion = 6000) {
  const texto = nodo();
  const accion = nodo();
  const raiz = { ...nodo(), querySelector: selector => ({ '.pr-aviso__texto': texto, '.pr-aviso__accion': accion })[selector] };
  let ahora = 0;
  let siguiente = 0;
  const pendientes = new Map();
  const reloj = {
    setTimeout(fn, ms) { pendientes.set(++siguiente, { fn, vence: ahora + ms }); return siguiente; },
    clearTimeout(id) { pendientes.delete(id); }
  };
  const avanzar = ms => {
    ahora += ms;
    for (const [id, tarea] of [...pendientes]) if (tarea.vence <= ahora) { pendientes.delete(id); tarea.fn(); }
  };
  return { raiz, texto, accion, avanzar, aviso: crearAviso(raiz, { duracion, reloj }) };
}

test('muestra el texto y la acción Deshacer, y se retira solo al cumplirse la duración', () => {
  const { raiz, texto, accion, avanzar, aviso } = preparar();
  aviso.mostrar({ texto: 'Promoción guardada.', alDeshacer: () => {} });
  assert.equal(raiz.hidden, false);
  assert.equal(texto.textContent, 'Promoción guardada.');
  assert.equal(accion.textContent, 'Deshacer');
  assert.equal(accion.hidden, false);
  avanzar(5999);
  assert.equal(raiz.hidden, false);
  avanzar(1);
  assert.equal(raiz.hidden, true);
});

test('Deshacer se ejecuta una sola vez y retira el aviso', async () => {
  const { raiz, accion, aviso } = preparar();
  let veces = 0;
  aviso.mostrar({ texto: 'Promoción guardada.', alDeshacer: () => { veces += 1; } });
  await accion.emitir('click');
  await accion.emitir('click');
  assert.equal(veces, 1);
  assert.equal(raiz.hidden, true);
});

test('un aviso nuevo reemplaza al anterior y su Deshacer deja de estar disponible', async () => {
  const { accion, avanzar, raiz, aviso } = preparar();
  const llamadas = [];
  aviso.mostrar({ texto: 'Primero', alDeshacer: () => llamadas.push('primero') });
  avanzar(4000);
  aviso.mostrar({ texto: 'Segundo', alDeshacer: () => llamadas.push('segundo') });
  avanzar(4000);
  assert.equal(raiz.hidden, false, 'el segundo aviso cuenta su propia duración');
  await accion.emitir('click');
  assert.deepEqual(llamadas, ['segundo']);
});

test('sin acción de deshacer, el botón no se muestra', () => {
  const { accion, aviso } = preparar();
  aviso.mostrar({ texto: 'No se pudo deshacer. Intenta de nuevo.' });
  assert.equal(accion.hidden, true);
});

test('el foco o el puntero dentro del aviso detienen el tiempo y al salir vuelve a contar completo', () => {
  const { raiz, avanzar, aviso } = preparar();
  aviso.mostrar({ texto: 'Promoción guardada.', alDeshacer: () => {} });
  avanzar(3000);
  raiz.emitir('focusin');
  avanzar(20000);
  assert.equal(raiz.hidden, false);
  raiz.emitir('focusout');
  avanzar(5999);
  assert.equal(raiz.hidden, false);
  avanzar(1);
  assert.equal(raiz.hidden, true);

  aviso.mostrar({ texto: 'Otra vez', alDeshacer: () => {} });
  raiz.emitir('pointerenter');
  avanzar(20000);
  assert.equal(raiz.hidden, false);
  raiz.emitir('pointerleave');
  avanzar(6000);
  assert.equal(raiz.hidden, true);
});

test('cerrar retira el aviso y anula su Deshacer', async () => {
  const { raiz, accion, aviso } = preparar();
  let veces = 0;
  aviso.mostrar({ texto: 'Promoción guardada.', alDeshacer: () => { veces += 1; } });
  aviso.cerrar();
  assert.equal(raiz.hidden, true);
  await accion.emitir('click');
  assert.equal(veces, 0);
});
