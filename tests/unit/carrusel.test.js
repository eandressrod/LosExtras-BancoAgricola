import test from 'node:test';
import assert from 'node:assert/strict';
import { crearReproductor } from '../../public/js/carrusel.js';

function reloj() {
  let ahora = 0;
  let siguiente = 0;
  const pendientes = new Map();
  return {
    setTimeout(fn, ms) { pendientes.set(++siguiente, { fn, vence: ahora + ms }); return siguiente; },
    clearTimeout(id) { pendientes.delete(id); },
    avanzar(ms) {
      const fin = ahora + ms;
      for (;;) {
        const [id, tarea] = [...pendientes].sort((a, b) => a[1].vence - b[1].vence)[0] ?? [];
        if (!tarea || tarea.vence > fin) break;
        ahora = tarea.vence;
        pendientes.delete(id);
        tarea.fn();
      }
      ahora = fin;
    }
  };
}

function preparar(opciones = {}) {
  const tiempo = reloj();
  const cambios = [];
  const r = crearReproductor({ total: 3, intervalo: 5000, reloj: tiempo, alCambiar: estado => cambios.push({ ...estado }), ...opciones });
  return { r, tiempo, cambios };
}

test('avanza solo cada intervalo y es circular', () => {
  const { r, tiempo } = preparar();
  r.iniciar();
  assert.equal(r.estado().indice, 0);
  tiempo.avanzar(5000);
  assert.equal(r.estado().indice, 1);
  tiempo.avanzar(10000);
  assert.equal(r.estado().indice, 0);
});

test('la pausa del usuario detiene todo hasta que vuelva a reproducir', () => {
  const { r, tiempo } = preparar();
  r.iniciar();
  r.detener();
  tiempo.avanzar(20000);
  assert.deepEqual(r.estado(), { indice: 0, reproduciendo: false, total: 3 });
  r.reproducir();
  tiempo.avanzar(5000);
  assert.equal(r.estado().indice, 1);
});

test('foco, salir de la vista o pestaña oculta retienen el avance y al soltarlos sigue', () => {
  const { r, tiempo } = preparar();
  r.iniciar();
  r.retener('foco');
  r.retener('vista');
  tiempo.avanzar(20000);
  assert.equal(r.estado().indice, 0);
  r.soltar('foco');
  tiempo.avanzar(20000);
  assert.equal(r.estado().indice, 0, 'sigue retenido mientras quede un motivo');
  r.soltar('vista');
  assert.equal(r.estado().reproduciendo, true);
  tiempo.avanzar(5000);
  assert.equal(r.estado().indice, 1);
});

test('soltar una retención no reanuda si el usuario lo detuvo', () => {
  const { r, tiempo } = preparar();
  r.iniciar();
  r.retener('foco');
  r.detener();
  r.soltar('foco');
  tiempo.avanzar(10000);
  assert.equal(r.estado().indice, 0);
  assert.equal(r.estado().reproduciendo, false);
});

test('ir, siguiente y anterior navegan y reinician el tiempo de la diapositiva', () => {
  const { r, tiempo } = preparar();
  r.iniciar();
  tiempo.avanzar(4000);
  r.ir(2);
  tiempo.avanzar(4000);
  assert.equal(r.estado().indice, 2, 'la diapositiva elegida cuenta su tiempo completo');
  r.siguiente();
  assert.equal(r.estado().indice, 0);
  r.anterior();
  assert.equal(r.estado().indice, 2);
});

test('con movimiento reducido empieza detenido y con una sola diapositiva nunca avanza', () => {
  const reducido = preparar({ reducido: true });
  reducido.r.iniciar();
  reducido.tiempo.avanzar(20000);
  assert.deepEqual(reducido.r.estado(), { indice: 0, reproduciendo: false, total: 3 });

  const una = preparar({ total: 1 });
  una.r.iniciar();
  una.tiempo.avanzar(20000);
  assert.equal(una.r.estado().reproduciendo, false);
});

test('avisa cada cambio de diapositiva o de reproducción y parar libera el temporizador', () => {
  const { r, tiempo, cambios } = preparar();
  r.iniciar();
  tiempo.avanzar(5000);
  r.detener();
  assert.deepEqual(cambios.map(c => [c.indice, c.reproduciendo]), [[0, true], [1, true], [1, false]]);
  r.reproducir();
  r.parar();
  tiempo.avanzar(20000);
  assert.equal(r.estado().indice, 1);
});
