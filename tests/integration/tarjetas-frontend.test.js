import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirDetalle, almacen, TARJETAS } from './pagina-promociones.js';

// H16 en las páginas reales: selector de tarjetas propias, elección por sesión y perfil, y detalle coherente.

test('H16 con dos tarjetas muestra el selector por tipo y referencia y empieza con la del perfil', async () => {
  const p = await abrirListado();
  assert.equal(p.obtener('#card-choice').hidden, false);
  assert.equal(p.obtener('#card-single').hidden, true);
  assert.deepEqual(p.opciones().map(opcion => opcion.textContent), ['Básica •••• 4821', 'Black •••• 7754']);
  assert.ok(p.opciones().every(opcion => opcion.type === 'button'));
  assert.deepEqual(p.tarjetaActiva(), ['Básica •••• 4821']);
  assert.deepEqual(p.consultas, ['/api/promociones?tarjeta=cta-a-3']);
  assert.equal(p.obtener('#session-profile').textContent, 'Usuario A · Tarjeta Básica');
  assert.equal(p.sesion.getItem('los-extras-tarjeta:A'), 'cta-a-3');
});

test('H16 elegir otra tarjeta actualiza ofertas y beneficio, conserva la categoría y recuerda la elección', async () => {
  const p = await abrirListado({ search: '?categoria=Compras' });
  await p.opcion('Black •••• 7754').click();
  assert.equal(p.consultas.at(-1), '/api/promociones?categoria=Compras&tarjeta=cta-a-4');
  assert.deepEqual(p.tarjetaActiva(), ['Black •••• 7754']);
  assert.deepEqual(p.activo(), ['Compras']);
  assert.equal(p.sesion.getItem('los-extras-tarjeta:A'), 'cta-a-4');
  assert.equal(p.obtener('#session-profile').textContent, 'Usuario A · Tarjeta Black');
  assert.equal(p.history.url, '/promociones.html?categoria=Compras');
});

test('H16 al volver al listado se conserva la tarjeta elegida en la sesión', async () => {
  const p = await abrirListado({ sesion: almacen({ 'los-extras-tarjeta:A': 'cta-a-4' }) });
  assert.deepEqual(p.consultas, ['/api/promociones?tarjeta=cta-a-4']);
  assert.deepEqual(p.tarjetaActiva(), ['Black •••• 7754']);
});

test('H16 con una sola tarjeta no se muestra selector y se usa esa tarjeta', async () => {
  const p = await abrirListado({ perfil: 'B' });
  assert.equal(p.obtener('#card-choice').hidden, true);
  assert.equal(p.obtener('#card-single').hidden, false);
  assert.equal(p.obtener('#card-single').textContent, 'Tus beneficios con Tarjeta Black •••• 0341');
  assert.deepEqual(p.consultas, ['/api/promociones?tarjeta=cta-b-2']);
});

test('H16 un perfil sin cuentas de tarjeta usa la tarjeta de su perfil sin selector', async () => {
  const p = await abrirListado({ tarjetas: () => [{ id: null, tipoTarjeta: 'basica', nombre: 'Tarjeta Básica', numeroEnmascarado: null, predeterminada: true }] });
  assert.equal(p.obtener('#card-choice').hidden, true);
  assert.equal(p.obtener('#card-single').textContent, 'Tus beneficios con Tarjeta Básica');
  assert.deepEqual(p.consultas, ['/api/promociones']);
  assert.equal(p.sesion.getItem('los-extras-tarjeta:A'), null);
});

test('H16 sin tarjetas hay un estado comprensible y no se consultan ofertas', async () => {
  const p = await abrirListado({ tarjetas: () => [] });
  assert.equal(p.obtener('#list-status').textContent, 'No tienes tarjetas para consultar beneficios.');
  assert.deepEqual(p.consultas, []);
  assert.equal(p.obtener('#category-filter').hidden, true);
  assert.equal(p.obtener('#card-choice').hidden, true);
  assert.equal(p.obtener('#retry').hidden, true);
});

test('H16 si fallan las tarjetas se puede reintentar', async () => {
  let falla = true;
  const p = await abrirListado({ tarjetas: () => {
    if (falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
    return TARJETAS.A;
  } });
  assert.equal(p.obtener('#list-status').className, 'error');
  assert.equal(p.obtener('#retry').hidden, false);
  assert.deepEqual(p.consultas, []);
  falla = false;
  await p.obtener('#retry').click();
  assert.equal(p.pedidas.tarjetas, 2);
  assert.deepEqual(p.opciones().map(opcion => opcion.textContent), ['Básica •••• 4821', 'Black •••• 7754']);
  assert.deepEqual(p.consultas, ['/api/promociones?tarjeta=cta-a-3']);
});

test('H16 una elección guardada que ya no es propia se descarta', async () => {
  const p = await abrirListado({ sesion: almacen({ 'los-extras-tarjeta:A': 'cta-b-2' }) });
  assert.deepEqual(p.consultas, ['/api/promociones?tarjeta=cta-a-3']);
  assert.equal(p.sesion.getItem('los-extras-tarjeta:A'), 'cta-a-3');
});

test('H16 el detalle consulta con la tarjeta elegida y la muestra en la cabecera', async () => {
  const p = await abrirDetalle({ search: '?id=tienda', sesion: almacen({ 'los-extras-tarjeta:A': 'cta-a-4' }) });
  assert.deepEqual(p.consultas, ['/api/promocion?id=tienda&tarjeta=cta-a-4']);
  assert.equal(p.obtener('#benefit').textContent, '25 % de descuento');
  assert.equal(p.obtener('#session-profile').textContent, 'Usuario A · Tarjeta Black');
});
