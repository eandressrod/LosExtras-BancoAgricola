import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenarParaTi } from '../../public/js/motor/index.js';

const oferta = (id, merchantId, category, addedOn = '2026-10-10') => ({
  id, merchantId, merchant: merchantId.toUpperCase(), category, categoryName: 'Nombre ' + category, addedOn,
  availableToday: false, canUse: true, benefit: '10 %', applicableCard: 'basica', usageDays: null,
  channels: ['presencial'], benefitType: 'descuento'
});
const interes = (ambito, valor) => ({ clase: 'interes', ambito, valor, origen: 'encuesta', activa: true });

test('SCRUM-149 Explorar no muestra razones de intereses, pero las señales siguen ordenando', () => {
  const ofertas = [oferta('x1', 'm1', 'X'), oferta('y1', 'm2', 'Y', '2026-10-12')];
  const respuesta = ordenarParaTi({ ofertas, senales: [interes('categoria', 'X')], alcance: 'todo' });
  assert.equal(respuesta.promociones.length, 2);
  assert.ok(respuesta.promociones.every(promo => promo.razon === null), 'sin «Por tu interés en…»');
  assert.ok(respuesta.promociones.find(promo => promo.id === 'x1').componentes.R > 0, 'el interés declarado sigue puntuando');
});
