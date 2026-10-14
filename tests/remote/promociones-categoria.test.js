import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRepositorio } from '../../backend/repositorios/index.js';
import { filtrarPromociones, filtrarPorCategoria } from '../../backend/promociones.js';
import { CATEGORIAS_PERMITIDAS } from '../../backend/servicios/preferencias.js';

// H5 con datos reales (solo lectura): los filtros cubren el catálogo y solo restringen lo aplicable.
test('H5 el catálogo real usa solo las categorías del filtro y cada filtro restringe lo aplicable por tarjeta', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
  assert.ok(catalogo.length > 0);
  for (const promo of catalogo) {
    assert.ok(CATEGORIAS_PERMITIDAS.has(promo.category), `${promo.id} tiene la categoría ${promo.category}, sin filtro en Para ti`);
  }
  const ids = lista => lista.map(promo => promo.id);
  for (const tarjeta of ['basica', 'black']) {
    const aplicables = filtrarPromociones(catalogo, tarjeta, []);
    const repartidas = [...CATEGORIAS_PERMITIDAS].flatMap(categoria => {
      const filtradas = filtrarPorCategoria(aplicables, categoria);
      assert.ok(filtradas.every(promo => promo.category === categoria && promo.applicableCard === tarjeta), `${tarjeta} · ${categoria}`);
      return ids(filtradas);
    });
    assert.deepEqual(repartidas.toSorted(), ids(aplicables).toSorted(), tarjeta);
  }
});
