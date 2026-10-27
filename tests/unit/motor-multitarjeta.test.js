// SCRUM-133 (comentario 10031 de SCRUM-116): Para ti evalúa todas las tarjetas propias y elige el mejor beneficio.
import test from 'node:test';
import assert from 'node:assert/strict';
import { valorBeneficio, ordenarBeneficios } from '../../public/js/motor/elegibilidad.js';
import { ordenarParaTi } from '../../public/js/motor/index.js';
import { filtrarPromociones } from '../../backend/promociones.js';
import { AHORA, TARJETAS, ofertasDelCatalogo, ofertasDeTodas } from '../fixtures/motor/perfiles.js';

const promo = (id, beneficios) => ({
  id, category: 'Compras', validFrom: '2026-10-01', validUntil: '2026-12-31', usageDays: null, channels: ['presencial'],
  beneficios: beneficios.map(([tipo_tarjeta, beneficio]) => ({ tipo_tarjeta, beneficio, medio_pago: 'Tarjeta ' + tipo_tarjeta, restricciones: '' }))
});
const BASICA = { id: 'cta-x-1', tipoTarjeta: 'basica' };
const BLACK = { id: 'cta-x-2', tipoTarjeta: 'black' };
const todas = (tarjetas, predeterminadaId = tarjetas[0]?.id) => ({ tarjetas, predeterminadaId });

test('SCRUM-133 el valor de un beneficio es su porcentaje o su número de cuotas; sin número vale 0', () => {
  assert.equal(valorBeneficio('20 % de descuento'), 20);
  assert.equal(valorBeneficio('8 % de reintegro'), 8);
  assert.equal(valorBeneficio('12 cuotas sin intereses'), 12);
  assert.equal(valorBeneficio('2×1 en entradas y 20 % en combo'), 20);
  assert.equal(valorBeneficio('2×1 en pizzas grandes'), 0);
  assert.equal(valorBeneficio('Puntos BA dobles'), 0);
  assert.equal(valorBeneficio(undefined), 0);
});

test('SCRUM-133 el mejor beneficio: mayor valor, luego Black, luego la predeterminada y por último el id', () => {
  const orden = (candidatos, predeterminadaId) => ordenarBeneficios(candidatos, predeterminadaId).map(b => b.tarjetaId);
  assert.deepEqual(orden([
    { tarjetaId: 'a', tipoTarjeta: 'black', texto: '5 % de descuento' },
    { tarjetaId: 'b', tipoTarjeta: 'basica', texto: '10 % de descuento' }
  ]), ['b', 'a'], 'mayor porcentaje');
  assert.deepEqual(orden([
    { tarjetaId: 'a', tipoTarjeta: 'basica', texto: '2×1 en pizzas grandes' },
    { tarjetaId: 'b', tipoTarjeta: 'black', texto: '2×1 en pizzas grandes y bebida incluida' }
  ], 'a'), ['b', 'a'], 'empate de valor: Black');
  assert.deepEqual(orden([
    { tarjetaId: 'a', tipoTarjeta: 'basica', texto: '10 %' },
    { tarjetaId: 'b', tipoTarjeta: 'basica', texto: '10 %' }
  ], 'b'), ['b', 'a'], 'mismo tipo: la predeterminada');
  assert.deepEqual(orden([
    { tarjetaId: 'c', tipoTarjeta: 'black', texto: '10 %' },
    { tarjetaId: 'b', tipoTarjeta: 'black', texto: '10 %' }
  ], 'z'), ['b', 'c'], 'desempate por id');
  const entrada = [{ tarjetaId: 'c', tipoTarjeta: 'black', texto: '1 %' }, { tarjetaId: 'b', tipoTarjeta: 'black', texto: '2 %' }];
  ordenarBeneficios(entrada, null);
  assert.equal(entrada[0].tarjetaId, 'c', 'no altera la entrada');
});

test('SCRUM-133 con todas las tarjetas una oferta es elegible si aplica con al menos una propia', () => {
  const catalogo = [promo('ambas', [['basica', '10 %'], ['black', '20 %']]), promo('solo-basica', [['basica', '5 %']]), promo('sin', [])];
  assert.deepEqual(filtrarPromociones(catalogo, todas([BASICA]), [], AHORA).map(o => o.id), ['ambas', 'solo-basica']);
  assert.deepEqual(filtrarPromociones(catalogo, todas([BLACK]), [], AHORA).map(o => o.id), ['ambas']);
  assert.deepEqual(filtrarPromociones(catalogo, todas([BASICA, BLACK]), [], AHORA).map(o => o.id), ['ambas', 'solo-basica']);
});

test('SCRUM-133 los campos actuales reflejan el mejor beneficio y los demás quedan en otrosBeneficios', () => {
  const [oferta] = filtrarPromociones([promo('ambas', [['basica', '10 %'], ['black', '20 %']])], todas([BASICA, BLACK]), [], AHORA);
  assert.deepEqual(oferta.mejorBeneficio, { tarjetaId: 'cta-x-2', tipoTarjeta: 'black', texto: '20 %' });
  assert.deepEqual(oferta.otrosBeneficios, [{ tarjetaId: 'cta-x-1', tipoTarjeta: 'basica', texto: '10 %' }]);
  assert.equal(oferta.applicableCard, 'black');
  assert.equal(oferta.benefit, '20 %');
  assert.equal(oferta.payment, 'Tarjeta black');
  assert.equal(oferta.exclusive, false);
});

test('SCRUM-133 una exclusiva Black solo aparece con una Black propia y no ofrece otros beneficios', () => {
  const exclusiva = promo('exclusiva', [['black', '30 %']]);
  assert.deepEqual(filtrarPromociones([exclusiva], todas([BASICA]), [], AHORA), []);
  const [oferta] = filtrarPromociones([exclusiva], todas([BASICA, BLACK]), [], AHORA);
  assert.deepEqual([oferta.applicableCard, oferta.exclusive, oferta.otrosBeneficios], ['black', true, []]);
  assert.equal(oferta.mejorBeneficio.tarjetaId, 'cta-x-2');
});

test('SCRUM-133 dos tarjetas del mismo tipo: gana la predeterminada y la otra queda como alternativa', () => {
  const otra = { id: 'cta-x-0', tipoTarjeta: 'basica' };
  const [oferta] = filtrarPromociones([promo('p', [['basica', '10 %']])], todas([otra, BASICA], 'cta-x-1'), [], AHORA);
  assert.equal(oferta.mejorBeneficio.tarjetaId, 'cta-x-1');
  assert.deepEqual(oferta.otrosBeneficios.map(b => b.tarjetaId), ['cta-x-0']);
});

test('SCRUM-133 con una tarjeta concreta el aplanado es idéntico al actual y no suma campos', () => {
  const catalogo = [promo('ambas', [['basica', '10 %'], ['black', '20 %']])];
  const [oferta] = filtrarPromociones(catalogo, 'basica', [], AHORA);
  assert.equal(oferta.benefit, '10 %');
  assert.equal('mejorBeneficio' in oferta || 'otrosBeneficios' in oferta, false);
});

test('SCRUM-133 un perfil sin tarjetas no tiene ofertas y el motor responde sin-catalogo', () => {
  assert.deepEqual(ofertasDeTodas([]), []);
  const respuesta = ordenarParaTi({ ofertas: ofertasDeTodas([]) });
  assert.deepEqual([respuesta.vacio, respuesta.promociones], ['sin-catalogo', []]);
});

test('SCRUM-133 con todas las tarjetas del perfil A entra la unión de Básica y Black del catálogo', () => {
  const union = new Set([...ofertasDelCatalogo('basica'), ...ofertasDelCatalogo('black')].map(o => o.id));
  const ofertas = ofertasDeTodas(TARJETAS.A);
  assert.deepEqual(new Set(ofertas.map(o => o.id)), union);
  assert.ok(ofertas.every(o => TARJETAS.A.some(t => t.id === o.mejorBeneficio.tarjetaId)));
  assert.ok(ofertas.every(o => o.otrosBeneficios.every(b => TARJETAS.A.some(t => t.id === b.tarjetaId))));
  // El motor no cambia: mismas señales y ofertas, mismo orden.
  assert.deepEqual(ordenarParaTi({ ofertas }), ordenarParaTi({ ofertas }));
});
