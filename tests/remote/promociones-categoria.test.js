import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRepositorio, obtenerRepositorioPreferencias } from '../../backend/repositorios/index.js';
import { filtrarPromociones, filtrarPorCategoria } from '../../backend/promociones.js';

// H5 con datos reales (solo lectura): los filtros salen de la tabla categorias y solo restringen lo aplicable.
test('H5 el catálogo real usa categorías vigentes y cada filtro restringe lo aplicable por tarjeta', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const vigentes = new Set((await obtenerRepositorioPreferencias().obtenerCategorias()).map(categoria => categoria.id));
  const catalogo = await obtenerRepositorio().listarPromocionesConBeneficios();
  assert.ok(vigentes.size > 0 && catalogo.length > 0);
  for (const promo of catalogo) {
    assert.ok(vigentes.has(promo.category), `${promo.id} tiene la categoría ${promo.category}, sin filtro en Para ti`);
  }
  const ids = lista => lista.map(promo => promo.id);
  for (const tarjeta of ['basica', 'black']) {
    const aplicables = filtrarPromociones(catalogo, tarjeta, []);
    const repartidas = [...vigentes].flatMap(categoria => {
      const filtradas = filtrarPorCategoria(aplicables, categoria);
      assert.ok(filtradas.every(promo => promo.category === categoria && promo.applicableCard === tarjeta), `${tarjeta} · ${categoria}`);
      return ids(filtradas);
    });
    assert.deepEqual(repartidas.toSorted(), ids(aplicables).toSorted(), tarjeta);
  }
});
