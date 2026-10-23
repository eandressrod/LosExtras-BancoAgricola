import test from 'node:test';
import assert from 'node:assert/strict';
import { validarSenal, AMBITOS_POR_CLASE, ORIGENES, INDIFERENTE } from '../../public/js/motor/vocabulario.js';

const senal = cambios => ({ clase: 'interes', ambito: 'categoria', valor: 'Restaurantes', origen: 'encuesta', ...cambios });

test('H22 cada clase admite solo sus ámbitos del registro de señales', () => {
  assert.deepEqual(AMBITOS_POR_CLASE, {
    interes: ['categoria', 'subcategoria', 'comercio'],
    criterio: ['canal', 'beneficio', 'descubrir', 'zona'],
    rechazo: ['oferta', 'comercio', 'categoria']
  });
  assert.deepEqual(ORIGENES, ['encuesta', 'pregunta', 'tarjeta']);
  assert.equal(validarSenal(senal()), null);
  assert.equal(validarSenal(senal({ clase: 'rechazo', ambito: 'oferta', valor: 'cine', origen: 'tarjeta' })), null);
  assert.match(validarSenal(senal({ clase: 'puntaje' })), /clase/);
  assert.match(validarSenal(senal({ ambito: 'canal' })), /ámbito/);
  assert.match(validarSenal(senal({ origen: 'impresion' })), /origen/);
});

test('H22 el valor es un texto de 1 a 100 caracteres', () => {
  for (const valor of ['', '   ', 'x'.repeat(101), 3, null]) assert.match(validarSenal(senal({ valor })), /valor/, String(valor));
  assert.equal(validarSenal(senal({ valor: 'x'.repeat(100) })), null);
});

test('H22 canal, beneficio y descubrir solo aceptan las opciones de la encuesta, con indiferencia declarada', () => {
  const criterio = (ambito, valor) => validarSenal(senal({ clase: 'criterio', ambito, valor }));
  for (const valor of ['presencial', 'delivery', 'en-linea', INDIFERENTE]) assert.equal(criterio('canal', valor), null);
  for (const valor of ['descuento', '2x1-combo', 'cuotas-sin-intereses', 'cashback-puntos', INDIFERENTE]) assert.equal(criterio('beneficio', valor), null);
  for (const valor of ['siempre', 'mezcla', 'nuevos']) assert.equal(criterio('descubrir', valor), null);
  assert.match(criterio('canal', 'tienda'), /valor/);
  assert.match(criterio('beneficio', 'precio'), /valor/);
  assert.match(criterio('descubrir', INDIFERENTE), /valor/);
  assert.equal(criterio('zona', 'san-salvador'), null);
});

test('H22 una entrada que no es objeto no es una señal', () => {
  for (const entrada of [null, undefined, 'interes', []]) assert.match(validarSenal(entrada), /clase/);
});
