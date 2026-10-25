// SCRUM-133: sin ?tarjeta= el detalle evalúa todas las tarjetas propias, como Para ti, y suma beneficiosPropios.
import test from 'node:test';
import assert from 'node:assert/strict';
import promocion from '../../api/promocion.js';
import paraTi from '../../backend/handlers/para-ti.js';
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'scrum-133-detalle-pruebas'.repeat(2);

const pedir = (ruta, perfilId) => new Request('http://localhost' + ruta,
  { headers: perfilId ? { cookie: `sesion_extras=${crearToken(perfilId)}` } : {} });
async function json(handler, ruta, perfilId) {
  const respuesta = await handler.fetch(pedir(ruta, perfilId));
  assert.equal(respuesta.status, 200, ruta);
  return respuesta.json();
}

test('SCRUM-133 sin tarjeta el detalle trae el mejor beneficio y todos los beneficios propios que aplican', async () => {
  const detalle = await json(promocion, '/api/promocion?id=restaurante', 'A');
  assert.deepEqual(detalle.beneficiosPropios, [
    { tarjetaId: 'cta-a-4', tipoTarjeta: 'black', texto: '20 % de descuento' },
    { tarjetaId: 'cta-a-3', tipoTarjeta: 'basica', texto: '10 % de descuento' }
  ]);
  assert.deepEqual([detalle.applicableCard, detalle.benefit], ['black', '20 % de descuento']);
  assert.deepEqual(detalle.mejorBeneficio, detalle.beneficiosPropios[0]);
});

test('SCRUM-133 una exclusiva Black se abre sin tarjeta solo si el perfil tiene una Black', async () => {
  const exclusiva = await json(promocion, '/api/promocion?id=siman-black', 'A');
  assert.deepEqual(exclusiva.beneficiosPropios.map(b => b.tarjetaId), ['cta-a-4']);
  assert.equal(exclusiva.exclusive, true);
  assert.equal((await promocion.fetch(pedir('/api/promocion?id=siman-black', 'demo'))).status, 404);
});

test('SCRUM-133 con tarjeta el detalle no cambia ni suma beneficios propios', async () => {
  const basica = await json(promocion, '/api/promocion?id=restaurante&tarjeta=cta-a-3', 'A');
  assert.equal(basica.benefit, '10 % de descuento');
  assert.equal('beneficiosPropios' in basica || 'mejorBeneficio' in basica, false);
  assert.equal((await promocion.fetch(pedir('/api/promocion?id=siman-black&tarjeta=cta-a-3', 'A'))).status, 404);
});

test('SCRUM-133 el detalle sin tarjeta coincide con la oferta de Para ti sin tarjeta y aísla a cada perfil', async () => {
  for (const perfilId of ['A', 'B']) {
    const { promociones } = await json(paraTi, '/api/para-ti', perfilId);
    for (const oferta of promociones) {
      const { beneficiosPropios, ...detalle } = await json(promocion, '/api/promocion?id=' + oferta.id, perfilId);
      assert.deepEqual(beneficiosPropios, [oferta.mejorBeneficio, ...oferta.otrosBeneficios], oferta.id);
      assert.equal(detalle.benefit, oferta.benefit, oferta.id);
      assert.ok(beneficiosPropios.every(b => b.tarjetaId.startsWith(perfilId === 'A' ? 'cta-a-' : 'cta-b-')), oferta.id);
    }
  }
});
