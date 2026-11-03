import test from 'node:test';
import assert from 'node:assert/strict';
import { volverConHistorial } from '../../public/js/volver.js';

// SCRUM-142: «volver» regresa en el historial cuando la página anterior es su destino, en vez de apilar otra entrada.
function preparar({ href = 'https://app.test/promociones.html?categoria=Compras#promo-tienda', referrer, entradas = 3 } = {}) {
  const enlace = { href, oyentes: {}, addEventListener(tipo, accion) { this.oyentes[tipo] = accion; } };
  const historial = { length: entradas, atras: 0, back() { this.atras += 1; } };
  volverConHistorial(enlace, { documento: { referrer }, historial });
  const evento = { evitado: false, preventDefault() { this.evitado = true; } };
  enlace.oyentes.click(evento);
  return { historial, evento };
}

test('si se llegó desde el destino del enlace, vuelve en el historial', () => {
  const { historial, evento } = preparar({ referrer: 'https://app.test/promociones.html?seccion=para-ti' });
  assert.equal(evento.evitado, true);
  assert.equal(historial.atras, 1);
});

test('si se llegó desde otra página, el enlace navega como siempre', () => {
  for (const referrer of ['https://app.test/guardadas.html', '', 'https://otro.test/promociones.html']) {
    const { historial, evento } = preparar({ referrer });
    assert.equal(evento.evitado, false, referrer || 'sin referente');
    assert.equal(historial.atras, 0);
  }
});

test('sin una entrada anterior en el historial, el enlace navega como siempre', () => {
  const { historial, evento } = preparar({ referrer: 'https://app.test/promociones.html', entradas: 1 });
  assert.equal(evento.evitado, false);
  assert.equal(historial.atras, 0);
});
