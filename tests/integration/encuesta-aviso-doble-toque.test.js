// SCRUM-139: un doble toque en «Empezar» del aviso de la encuesta no debe caer sobre la tarjeta de abajo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, PROMOS, parametro } from './pagina-promociones.js';

const esperar = () => new Promise(resolve => setImmediate(resolve));

test('SCRUM-139 el aviso sigue en su sitio hasta que la hoja se abre y un doble toque la abre una sola vez', async () => {
  let liberar;
  const explorar = new Promise(resolve => { liberar = resolve; });
  const p = await abrirListado({
    preferencias: () => ({ completed: false }), marcas: { hojaMostrada: true, avisoCerrado: false },
    responder: url => parametro(url, 'explorar') ? explorar.then(() => PROMOS.todas) : PROMOS[parametro(url, 'categoria') ?? 'todas']
  });
  const aviso = p.elementos.get('#encuesta-aviso');
  const empezar = p.elementos.get('#encuesta-aviso-empezar');
  assert.equal(aviso.hidden, false);
  // Dos toques seguidos mientras se piden las opciones de la encuesta.
  const primero = empezar.listeners.click();
  const segundo = empezar.listeners.click();
  await esperar();
  assert.equal(aviso.hidden, false, 'si el aviso se oculta antes de abrir la hoja, la lista sube bajo el dedo');
  liberar();
  await Promise.all([primero, segundo]);
  assert.equal(p.hojas.length, 1, 'el segundo toque no abre otra hoja');
  assert.equal(aviso.hidden, true, 'con la hoja abierta el aviso se retira');
});
