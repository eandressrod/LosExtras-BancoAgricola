import test from 'node:test';
import assert from 'node:assert/strict';
import { leerTarjetaElegida, guardarTarjetaElegida, tarjetaActiva, etiquetaTarjeta, textoTarjeta, conTarjeta, descripcionTarjetas, textoInsignia, mostrarTarjetasSesion } from '../../public/js/tarjeta-elegida.js';
import { almacenSesion, forgetCardSelections } from '../../public/js/comun.js';

function almacen(inicial = {}) {
  const datos = new Map(Object.entries(inicial));
  return {
    datos,
    get length() { return datos.size; },
    key: indice => [...datos.keys()][indice] ?? null,
    getItem: clave => datos.get(clave) ?? null,
    setItem: (clave, valor) => { datos.set(clave, String(valor)); },
    removeItem: clave => { datos.delete(clave); }
  };
}
const TARJETAS_A = [
  { id: 'cta-a-3', tipoTarjeta: 'basica', numeroEnmascarado: '•••• 4821', predeterminada: true },
  { id: 'cta-a-4', tipoTarjeta: 'black', numeroEnmascarado: '•••• 7754', predeterminada: false }
];

test('H16 la elección se guarda por perfil: otro perfil no la ve', () => {
  const sesion = almacen();
  assert.equal(guardarTarjetaElegida(sesion, 'A', 'cta-a-4'), true);
  assert.equal(leerTarjetaElegida(sesion, 'A'), 'cta-a-4');
  assert.equal(leerTarjetaElegida(sesion, 'B'), null);
});

test('H16 la tarjeta activa es la elegida si sigue siendo propia; si no, la predeterminada', () => {
  assert.equal(tarjetaActiva(TARJETAS_A, 'cta-a-4').id, 'cta-a-4');
  assert.equal(tarjetaActiva(TARJETAS_A, null).id, 'cta-a-3');
  assert.equal(tarjetaActiva(TARJETAS_A, 'cta-b-2').id, 'cta-a-3');
  assert.equal(tarjetaActiva([], 'cta-a-3'), null);
});

test('H16 iniciar o cerrar sesión borra las elecciones de tarjeta y nada más', () => {
  const sesion = almacen({ 'los-extras-tarjeta:A': 'cta-a-4', 'los-extras-tarjeta:B': 'cta-b-2', 'otra-clave': 'x' });
  forgetCardSelections(sesion);
  assert.deepEqual([...sesion.datos.keys()], ['otra-clave']);
});

test('H16 cada tarjeta se identifica por tipo y referencia enmascarada', () => {
  assert.equal(etiquetaTarjeta(TARJETAS_A[1]), 'Black •••• 7754');
  assert.equal(textoTarjeta(TARJETAS_A[0]), 'Tarjeta Básica •••• 4821');
  assert.equal(textoTarjeta({ id: null, tipoTarjeta: 'black', numeroEnmascarado: null }), 'Tarjeta Black');
});

test('H16 la consulta lleva la tarjeta elegida junto al filtro de categoría', () => {
  assert.equal(conTarjeta('/api/promociones', 'cta-a-4'), '/api/promociones?tarjeta=cta-a-4');
  assert.equal(conTarjeta('/api/promociones?categoria=Compras', 'cta-a-4'), '/api/promociones?categoria=Compras&tarjeta=cta-a-4');
  assert.equal(conTarjeta('/api/promocion?id=tienda', 'a b'), '/api/promocion?id=tienda&tarjeta=a%20b');
  assert.equal(conTarjeta('/api/promociones', null), '/api/promociones');
});

test('SCRUM-109 la etiqueta de la sesión nombra la tarjeta elegida si sigue siendo propia', () => {
  assert.equal(descripcionTarjetas(TARJETAS_A, 'cta-a-4'), 'Tarjeta Black');
  assert.equal(descripcionTarjetas(TARJETAS_A, 'cta-a-3'), 'Tarjeta Básica');
});

test('SCRUM-109 sin elección, varias tarjetas no se resumen en un tipo único', () => {
  assert.equal(descripcionTarjetas(TARJETAS_A, null), '2 tarjetas');
  assert.equal(descripcionTarjetas(TARJETAS_A, 'cta-b-2'), '2 tarjetas');
});

test('SCRUM-109 con una sola tarjeta se nombra esa; sin tarjetas no se inventa ninguna', () => {
  assert.equal(descripcionTarjetas([{ id: 'cta-b-2', tipoTarjeta: 'black' }], null), 'Tarjeta Black');
  assert.equal(descripcionTarjetas([], null), null);
  assert.equal(descripcionTarjetas(undefined, 'cta-a-3'), null);
});

test('SCRUM-109 la insignia muestra el nombre y, si se conocen, las tarjetas propias', () => {
  assert.equal(textoInsignia({ nombre: 'Usuario A', tipoTarjeta: 'basica' }, TARJETAS_A, 'cta-a-4'), 'Usuario A · Tarjeta Black');
  assert.equal(textoInsignia({ nombre: 'Usuario A', tipoTarjeta: 'basica' }, [], null), 'Usuario A');
});

async function conInsignia(respuesta, prueba) {
  const insignia = { textContent: 'Usuario A' };
  const anteriores = { document: globalThis.document, fetch: globalThis.fetch };
  const pedidas = [];
  globalThis.document = { querySelector: selector => selector === '#session-profile' ? insignia : null };
  globalThis.fetch = async url => { pedidas.push(url); return respuesta(); };
  try { await prueba(insignia, pedidas); } finally { Object.assign(globalThis, anteriores); }
}

test('SCRUM-109 la insignia de Encuesta y Preferencias se completa con la tarjeta elegida en Para ti', async () => {
  await conInsignia(() => ({ ok: true, status: 200, json: async () => TARJETAS_A }), async (insignia, pedidas) => {
    await mostrarTarjetasSesion({ id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' }, almacen({ 'los-extras-tarjeta:A': 'cta-a-4' }));
    assert.deepEqual(pedidas, ['/api/tarjetas']);
    assert.equal(insignia.textContent, 'Usuario A · Tarjeta Black');
  });
});

test('SCRUM-109 si no se pueden cargar las tarjetas la insignia conserva solo el nombre', async () => {
  await conInsignia(() => ({ ok: false, status: 503, json: async () => ({}) }), async insignia => {
    await mostrarTarjetasSesion({ id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' }, almacen());
    assert.equal(insignia.textContent, 'Usuario A');
  });
});

test('H16 sin almacenamiento del navegador la página sigue funcionando', () => {
  assert.equal(almacenSesion(), null);
  assert.equal(leerTarjetaElegida(null, 'A'), null);
  assert.equal(guardarTarjetaElegida(null, 'A', 'cta-a-4'), false);
  assert.doesNotThrow(() => forgetCardSelections(null));
});
