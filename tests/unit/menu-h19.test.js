import test from 'node:test';
import assert from 'node:assert/strict';

test('H19 TDD: valida metas y calcula progreso sin modificar saldos', async () => {
  const { validarMeta, progresoMeta } = await import('../../backend/servicios/productos-menu.js');
  assert.deepEqual(validarMeta({ nombre: ' Viaje ', objetivo: 500, ahorrado: 125 }), { nombre: 'Viaje', objetivo: 500, ahorrado: 125, moneda: 'USD' });
  assert.equal(progresoMeta({ objetivo: 500, ahorrado: 125 }), 25);
  for (const datos of [{ nombre: '', objetivo: 1, ahorrado: 0 }, { nombre: 'Meta', objetivo: 0, ahorrado: 0 }, { nombre: 'Meta', objetivo: 100, ahorrado: -1 }, { nombre: 'Meta', objetivo: 100, ahorrado: 101 }, { nombre: 'Meta', objetivo: Infinity, ahorrado: 0 }]) {
    assert.throws(() => validarMeta(datos), error => error.estado === 400);
  }
});

test('H19 TDD: cancela compartir y copia solo cuando compartir no está disponible', async () => {
  const { compartirCuenta } = await import('../../public/js/menu-modelo.js');
  const cuenta = { nombre: 'Cuenta', numeroCompleto: '100000001320' };
  let texto;
  assert.equal(await compartirCuenta(cuenta, { clipboard: { async writeText(t) { texto = t; } } }), 'copiado');
  assert.ok(texto.includes(cuenta.numeroCompleto));
  assert.equal(await compartirCuenta(cuenta, { async share() { throw Object.assign(new Error(), { name: 'AbortError' }); } }), 'cancelado');
  await assert.rejects(compartirCuenta({ nombre: 'Sin número' }, {}), /número/i);
});

test('H19 TDD: entrada de menú respeta encuesta y omisión ordinaria no vuelve a preguntar', async () => {
  const { destinoEntradaPromociones } = await import('../../public/js/menu-modelo.js');
  assert.equal(destinoEntradaPromociones('?entrada=menu', { completed: false }), '/encuesta.html');
  assert.equal(destinoEntradaPromociones('?entrada=menu', { completed: true }), null);
  assert.equal(destinoEntradaPromociones('', { completed: false }), null);
});

test('H19 TDD: saldos separan enteros y centavos elevados, conservando cero, moneda y ocultación', async () => {
  const { partesSaldo } = await import('../../public/js/menu-modelo.js');
  assert.deepEqual(partesSaldo({ saldo:11234.89, moneda:'USD' },true), { entero:'$11,234', centavos:'.89' });
  assert.deepEqual(partesSaldo({ saldo:0.01, moneda:'USD' },true), { entero:'$0', centavos:'.01' });
  assert.deepEqual(partesSaldo({ saldo:0, moneda:'USD' },true), { entero:'$0', centavos:'.00' });
  assert.deepEqual(partesSaldo({ saldo:11234.89, moneda:'USD' },false), { entero:'$••••', centavos:'' });
});
