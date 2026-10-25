// H22: la instantánea de Para ti conserva el orden durante la visita, solo en esta pestaña y por perfil.
import test from 'node:test';
import assert from 'node:assert/strict';
import { guardarInstantanea, leerInstantanea, marcarVencidas, olvidarInstantaneas, alcanceDeConsulta, DURACION_VISITA_MS } from '../../public/js/instantanea.js';

function almacen() {
  const datos = new Map();
  return {
    datos,
    get length() { return datos.size; },
    key: indice => [...datos.keys()][indice] ?? null,
    getItem: clave => datos.get(clave) ?? null,
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
    removeItem: clave => { datos.delete(clave); }
  };
}
const RESPUESTA = { version: 'v', estrategia: 'base', vacio: null, promociones: [{ id: 'a' }, { id: 'b' }] };
const CONSULTA = '/api/para-ti?tarjeta=cta-a-3';
const MEDIODIA = new Date('2026-10-21T18:00:00Z');
const despues = ms => new Date(MEDIODIA.getTime() + ms);

test('H22 la misma consulta del mismo perfil recupera el orden guardado', () => {
  const sesion = almacen();
  guardarInstantanea(sesion, 'A', CONSULTA, RESPUESTA, MEDIODIA);
  assert.deepEqual(leerInstantanea(sesion, 'A', CONSULTA, despues(60_000)), RESPUESTA);
  assert.equal(leerInstantanea(sesion, 'B', CONSULTA, despues(60_000)), null);
  assert.equal(leerInstantanea(sesion, 'A', '/api/para-ti?categoria=Compras&tarjeta=cta-a-3', despues(60_000)), null);
});

test('H22 una visita nueva empieza tras 30 minutos sin usar la instantánea o al cambiar de día', () => {
  const sesion = almacen();
  guardarInstantanea(sesion, 'A', CONSULTA, RESPUESTA, MEDIODIA);
  assert.ok(leerInstantanea(sesion, 'A', CONSULTA, despues(DURACION_VISITA_MS - 1000)));
  // Usarla renueva la visita.
  assert.ok(leerInstantanea(sesion, 'A', CONSULTA, despues(2 * DURACION_VISITA_MS - 2000)));
  assert.equal(leerInstantanea(sesion, 'A', CONSULTA, despues(3 * DURACION_VISITA_MS)), null);
  const noche = new Date('2026-10-22T05:50:00Z');
  guardarInstantanea(sesion, 'A', CONSULTA, RESPUESTA, noche);
  assert.equal(leerInstantanea(sesion, 'A', CONSULTA, new Date('2026-10-22T06:10:00Z')), null, 'medianoche en El Salvador');
});

test('H22 sin almacenamiento disponible o con datos dañados no hay instantánea ni errores', () => {
  assert.doesNotThrow(() => guardarInstantanea(null, 'A', CONSULTA, RESPUESTA, MEDIODIA));
  assert.equal(leerInstantanea(null, 'A', CONSULTA, MEDIODIA), null);
  const sesion = almacen();
  sesion.setItem('los-extras-instantanea:A:tarjeta:cta-a-3', '{dañado');
  assert.equal(leerInstantanea(sesion, 'A', CONSULTA, MEDIODIA), null);
});

test('H22 una promoción que vence durante la visita conserva su lugar marcada como vencida', () => {
  const lista = [{ id: 'a', validUntil: '2026-10-21' }, { id: 'b', validUntil: '2026-10-20' }, { id: 'c', validUntil: null }];
  assert.deepEqual(marcarVencidas(lista, MEDIODIA).map(p => [p.id, p.vencida]), [['a', false], ['b', true], ['c', false]]);
});

test('H22 cerrar o iniciar sesión olvida las instantáneas de todos los perfiles y nada más', () => {
  const sesion = almacen();
  guardarInstantanea(sesion, 'A', CONSULTA, RESPUESTA, MEDIODIA);
  guardarInstantanea(sesion, 'B', CONSULTA, RESPUESTA, MEDIODIA);
  sesion.setItem('los-extras-tarjeta:A', 'cta-a-3');
  olvidarInstantaneas(sesion);
  assert.deepEqual([...sesion.datos.keys()], ['los-extras-tarjeta:A']);
  assert.doesNotThrow(() => olvidarInstantaneas(null));
});

test('SCRUM-133 la clave distingue «todas las tarjetas» de una tarjeta concreta y conserva ambos órdenes', () => {
  const sesion = almacen();
  const TODAS = '/api/para-ti';
  const OTRO = { ...RESPUESTA, promociones: [{ id: 'z' }] };
  assert.equal(alcanceDeConsulta(TODAS), 'todas');
  assert.equal(alcanceDeConsulta('/api/para-ti?categoria=Compras'), 'todas');
  assert.equal(alcanceDeConsulta(CONSULTA), 'tarjeta:cta-a-3');
  guardarInstantanea(sesion, 'A', TODAS, OTRO, MEDIODIA);
  guardarInstantanea(sesion, 'A', CONSULTA, RESPUESTA, MEDIODIA);
  assert.deepEqual([...sesion.datos.keys()].sort(), ['los-extras-instantanea:A:tarjeta:cta-a-3', 'los-extras-instantanea:A:todas']);
  assert.deepEqual(leerInstantanea(sesion, 'A', TODAS, despues(60_000)), OTRO);
  assert.deepEqual(leerInstantanea(sesion, 'A', CONSULTA, despues(60_000)), RESPUESTA);
  olvidarInstantaneas(sesion);
  assert.equal(sesion.length, 0);
});
