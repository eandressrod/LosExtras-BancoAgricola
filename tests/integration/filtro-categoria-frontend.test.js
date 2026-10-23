import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirDetalle, CATEGORIAS, PROMOS, parametro } from './pagina-promociones.js';

// H5 en las páginas reales. Desde H16 cada consulta lleva la tarjeta activa (A: cta-a-3 por defecto).
const BASICA_A = 'tarjeta=cta-a-3';

test('H5 abre con Todas activo, consulta lo aplicable y marca la entrada del historial con su perfil', async () => {
  const p = await abrirListado();
  assert.deepEqual(p.consultas, [`/api/para-ti?${BASICA_A}`]);
  assert.deepEqual(p.activo(), ['Todas']);
  assert.deepEqual(p.history.state, { perfil: 'A', categoria: null });
  assert.equal(p.history.url, '/promociones.html');
  assert.equal(p.enlaces().length, 3);
});

test('H5 los filtros salen de las categorías vigentes y muestran su nombre', async () => {
  const p = await abrirListado({ categorias: () => [{ id: 'Restaurantes', nombre: 'Comida' }, { id: 'Compras', nombre: 'Compras' }] });
  assert.deepEqual(p.chips().map(chip => chip.textContent), ['Todas', 'Comida', 'Compras']);
  await p.chip('Comida').click();
  assert.equal(p.consultas.at(-1), `/api/para-ti?categoria=Restaurantes&${BASICA_A}`);
  assert.deepEqual(p.activo(), ['Comida']);
});

test('H5 elegir una categoría la marca activa, consulta con el filtro y lo lleva al detalle', async () => {
  const p = await abrirListado();
  await p.chip('Compras').click();
  assert.equal(p.consultas.at(-1), `/api/para-ti?categoria=Compras&${BASICA_A}`);
  assert.deepEqual(p.activo(), ['Compras']);
  assert.equal(p.history.url, '/promociones.html?categoria=Compras');
  assert.deepEqual(p.history.state, { perfil: 'A', categoria: 'Compras' });
  assert.deepEqual(p.enlaces().map(enlace => enlace.href), ['/detalle.html?id=tienda&categoria=Compras']);
});

test('H5 al volver del detalle restaura el mismo filtro y su listado', async () => {
  const p = await abrirListado({ search: '?categoria=Compras', hash: '#promo-tienda' });
  assert.deepEqual(p.consultas, [`/api/para-ti?categoria=Compras&${BASICA_A}`]);
  assert.deepEqual(p.activo(), ['Compras']);
  assert.equal(p.history.url, '/promociones.html?categoria=Compras#promo-tienda');
});

test('H5 una categoría de la URL que ya no existe se ignora', async () => {
  const p = await abrirListado({ search: '?categoria=Entretenimiento', categorias: () => CATEGORIAS.slice(0, 2) });
  assert.deepEqual(p.consultas, [`/api/para-ti?${BASICA_A}`]);
  assert.deepEqual(p.activo(), ['Todas']);
  assert.equal(p.history.url, '/promociones.html');
});

test('H5 otro perfil no hereda el filtro guardado en la entrada del usuario anterior', async () => {
  const p = await abrirListado({ search: '?categoria=Compras', estado: { perfil: 'A', categoria: 'Compras' }, perfil: 'B' });
  assert.deepEqual(p.consultas, ['/api/para-ti?tarjeta=cta-b-2']);
  assert.deepEqual(p.activo(), ['Todas']);
  assert.equal(p.history.url, '/promociones.html');
  assert.deepEqual(p.history.state, { perfil: 'B', categoria: null });
});

test('H5 sin resultados muestra el estado vacío con el nombre de la categoría, Ver todas y Cambiar mis preferencias', async () => {
  const p = await abrirListado({ search: '?categoria=Entretenimiento', categorias: () => [...CATEGORIAS.slice(0, 2), { id: 'Entretenimiento', nombre: 'Cine y más' }] });
  assert.equal(p.obtener('#list-status').textContent, 'No hay promociones de Cine y más para tu perfil.');
  assert.equal(p.obtener('#show-all').hidden, false);
  assert.equal(p.obtener('#empty-preferences').hidden, false);
  await p.obtener('#show-all').click();
  assert.equal(p.consultas.at(-1), `/api/para-ti?${BASICA_A}`);
  assert.deepEqual(p.activo(), ['Todas']);
  assert.equal(p.obtener('#show-all').hidden, true);
  assert.equal(p.obtener('#empty-preferences').hidden, true);
});

test('H5 si fallan las categorías se puede reintentar sin consultar ofertas a ciegas', async () => {
  let falla = true;
  const p = await abrirListado({ search: '?categoria=Compras', categorias: () => {
    if (falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
    return CATEGORIAS;
  } });
  assert.equal(p.obtener('#list-status').className, 'error');
  assert.equal(p.obtener('#retry').hidden, false);
  assert.deepEqual(p.consultas, []);
  falla = false;
  await p.obtener('#retry').click();
  assert.equal(p.pedidas.categorias, 2);
  assert.deepEqual(p.chips().map(chip => chip.textContent), ['Todas', 'Restaurantes', 'Compras', 'Entretenimiento']);
  assert.deepEqual(p.consultas, [`/api/para-ti?categoria=Compras&${BASICA_A}`]);
  assert.deepEqual(p.activo(), ['Compras']);
});

test('H5 un error de ofertas permite reintentar con el mismo filtro', async () => {
  let falla = true;
  const p = await abrirListado({ search: '?categoria=Compras', responder: () => {
    if (falla) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
    return PROMOS.Compras;
  } });
  assert.equal(p.obtener('#list-status').className, 'error');
  assert.equal(p.obtener('#retry').hidden, false);
  assert.deepEqual(p.activo(), ['Compras']);
  falla = false;
  await p.obtener('#retry').click();
  assert.deepEqual(p.consultas, [`/api/para-ti?categoria=Compras&${BASICA_A}`, `/api/para-ti?categoria=Compras&${BASICA_A}`]);
  assert.equal(p.pedidas.categorias, 1);
  assert.equal(p.obtener('#retry').hidden, true);
  assert.deepEqual(p.enlaces().map(enlace => enlace.id), ['promo-tienda']);
});

test('H5 una respuesta tardía de otro filtro no reemplaza la categoría elegida', async () => {
  let liberarCompras;
  const p = await abrirListado({ responder: url => {
    if (parametro(url, 'categoria') === 'Compras') return new Promise(resolver => { liberarCompras = () => resolver(PROMOS.Compras); });
    return PROMOS[parametro(url, 'categoria') ?? 'todas'];
  } });
  const compras = p.chip('Compras').click();
  await p.chip('Restaurantes').click();
  liberarCompras();
  await compras;
  assert.deepEqual(p.activo(), ['Restaurantes']);
  assert.deepEqual(p.enlaces().map(enlace => enlace.id), ['promo-restaurante']);
});

test('H5 el detalle vuelve al mismo listado filtrado y al mismo perfil', async () => {
  const p = await abrirDetalle({ search: '?id=tienda&categoria=Compras' });
  assert.deepEqual(p.consultas, ['/api/promocion?id=tienda']);
  assert.equal(p.volver(), '/promociones.html?categoria=Compras#promo-tienda');
  assert.deepEqual(p.history.state, { perfil: 'A', categoria: 'Compras' });
});

test('H5 el detalle no conserva el filtro de otro perfil y, si falla, el retorno mantiene el filtro', async () => {
  const otro = await abrirDetalle({ search: '?id=tienda&categoria=Compras', estado: { perfil: 'A', categoria: 'Compras' }, perfil: 'B' });
  assert.equal(otro.volver(), '/promociones.html#promo-tienda');
  assert.equal(otro.history.url, '/detalle.html?id=tienda');
  const fallido = await abrirDetalle({ search: '?id=tienda&categoria=Compras', falla: true });
  assert.equal(fallido.volver(), '/promociones.html?categoria=Compras');
  assert.equal(fallido.obtener('#retry').hidden, false);
});
