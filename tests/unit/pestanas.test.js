import test from 'node:test';
import assert from 'node:assert/strict';
import { SECCIONES, seccionVecina, leerSeccion, guardarSeccion, urlSeccion, seccionPorDeslizamiento } from '../../public/js/pestanas.js';

function almacen() {
  const datos = new Map();
  return { getItem: clave => datos.get(clave) ?? null, setItem: (clave, valor) => { datos.set(clave, String(valor)); }, removeItem: clave => { datos.delete(clave); } };
}

test('las secciones de Promociones son Para ti, Cerca de ti y Explorar, en ese orden', () => {
  assert.deepEqual(SECCIONES, ['para-ti', 'cerca', 'explorar']);
});

test('deslizar pasa a la sección vecina y se detiene en los extremos', () => {
  assert.equal(seccionVecina('para-ti', 1), 'cerca');
  assert.equal(seccionVecina('cerca', 1), 'explorar');
  assert.equal(seccionVecina('explorar', 1), 'explorar');
  assert.equal(seccionVecina('cerca', -1), 'para-ti');
  assert.equal(seccionVecina('para-ti', -1), 'para-ti');
  assert.equal(seccionVecina('inventada', 1), 'cerca', 'una sección desconocida cuenta como Para ti');
});

test('solo un gesto horizontal claro cambia de sección', () => {
  assert.equal(seccionPorDeslizamiento(-80, 10), 1, 'hacia la izquierda avanza');
  assert.equal(seccionPorDeslizamiento(80, -12), -1, 'hacia la derecha retrocede');
  assert.equal(seccionPorDeslizamiento(-30, 0), 0, 'muy corto');
  assert.equal(seccionPorDeslizamiento(-80, 70), 0, 'casi vertical: es desplazar la lista');
});

test('la sección elegida se recuerda por perfil y una desconocida vuelve a Para ti', () => {
  const sesion = almacen();
  assert.equal(leerSeccion(sesion, 'A'), 'para-ti');
  guardarSeccion(sesion, 'A', 'explorar');
  assert.equal(leerSeccion(sesion, 'A'), 'explorar');
  assert.equal(leerSeccion(sesion, 'B'), 'para-ti');
  sesion.setItem('extras.seccion.A', 'otra');
  assert.equal(leerSeccion(sesion, 'A'), 'para-ti');
  assert.equal(leerSeccion(null, 'A'), 'para-ti', 'sin almacenamiento se usa Para ti');
});

test('Explorar consulta el motor sin personalizar y sin intención del día', () => {
  assert.equal(urlSeccion('/api/para-ti?categoria=Compras&intencion=salir', 'explorar'), '/api/para-ti?categoria=Compras&explorar=1');
  assert.equal(urlSeccion('/api/para-ti', 'explorar'), '/api/para-ti?explorar=1');
  assert.equal(urlSeccion('/api/para-ti?intencion=salir', 'para-ti'), '/api/para-ti?intencion=salir');
});
