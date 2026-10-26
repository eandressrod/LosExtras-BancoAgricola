import test from 'node:test';
import assert from 'node:assert/strict';
import { motivoNoOrdenable, separarOrdenables } from '../../public/js/motor/elegibilidad.js';
import { perfilDeSenales } from '../../public/js/motor/perfil.js';
import { PERFILES } from '../fixtures/motor/perfiles.js';

const oferta = (cambios = {}) => ({ id: 'o', benefit: '10 %', applicableCard: 'basica', canUse: true, usageDays: null, channels: ['presencial'], ...cambios });

test('H22 una oferta es ordenable si tiene beneficio para la tarjeta, está vigente y define días y canal', () => {
  assert.equal(motivoNoOrdenable(oferta()), null);
  assert.equal(motivoNoOrdenable(oferta({ usageDays: [2, 3] })), null);
  assert.equal(motivoNoOrdenable(oferta({ benefit: null })), 'sin-beneficio');
  assert.equal(motivoNoOrdenable(oferta({ applicableCard: undefined })), 'sin-beneficio');
  assert.equal(motivoNoOrdenable(oferta({ canUse: false })), 'fuera-de-vigencia');
  assert.equal(motivoNoOrdenable(oferta({ usageDays: [] })), 'sin-dias');
  assert.equal(motivoNoOrdenable(oferta({ usageDays: undefined })), 'sin-dias');
  assert.equal(motivoNoOrdenable(oferta({ channels: [] })), 'sin-canal');
  assert.equal(motivoNoOrdenable(oferta({ channels: undefined })), 'sin-canal');
});

test('H22 el validador separa las no ordenables con su motivo y conserva el orden recibido', () => {
  const lista = [oferta({ id: 'a' }), oferta({ id: 'b', canUse: false }), oferta({ id: 'c' }), oferta({ id: 'd', channels: [] })];
  const { ordenables, descartadas } = separarOrdenables(lista);
  assert.deepEqual(ordenables.map(o => o.id), ['a', 'c']);
  assert.deepEqual(descartadas, [{ id: 'b', motivo: 'fuera-de-vigencia' }, { id: 'd', motivo: 'sin-canal' }]);
  assert.deepEqual(separarOrdenables(undefined), { ordenables: [], descartadas: [] });
});

test('H22 el perfil se deriva solo de señales activas y nunca guarda puntajes', () => {
  const perfil = perfilDeSenales(PERFILES.conRechazos);
  assert.deepEqual([...perfil.categorias], ['Restaurantes', 'Tecnología']);
  assert.deepEqual([...perfil.comercios], []);
  assert.deepEqual([...perfil.rechazos.ofertas], ['starbucks-regalo']);
  assert.deepEqual([...perfil.rechazos.comercios], ['claro']);
  assert.equal(perfil.sinIntereses, false);
  assert.ok(!JSON.stringify(Object.keys(perfil)).includes('puntaje'));
});

test('H22 los criterios declarados se separan de la indiferencia declarada', () => {
  const perfil = perfilDeSenales(PERFILES.conComercios);
  assert.deepEqual([...perfil.comercios], ['pizza-hut', 'cine']);
  assert.deepEqual([...perfil.canales], ['delivery']);
  assert.deepEqual([...perfil.beneficios], ['2x1-combo']);
  assert.equal(perfil.descubrir, 'mezcla');
  const indiferente = perfilDeSenales([
    { clase: 'criterio', ambito: 'canal', valor: 'indiferente', activa: true },
    { clase: 'criterio', ambito: 'beneficio', valor: 'indiferente', activa: true }
  ]);
  assert.deepEqual([...indiferente.canales], []);
  assert.deepEqual([...indiferente.indiferencias], ['canal', 'beneficio']);
});

test('H22 sin intereses activos el perfil está vacío, aunque declare criterios', () => {
  assert.equal(perfilDeSenales([]).sinIntereses, true);
  assert.equal(perfilDeSenales(undefined).sinIntereses, true);
  assert.equal(perfilDeSenales([{ clase: 'criterio', ambito: 'canal', valor: 'delivery', activa: true }]).sinIntereses, true);
  assert.equal(perfilDeSenales([{ clase: 'interes', ambito: 'categoria', valor: 'Compras', activa: false }]).sinIntereses, true);
});
