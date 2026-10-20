import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRepositorio, obtenerRepositorioPreferencias } from '../../backend/repositorios/index.js';
import { filtrarPromociones } from '../../backend/promociones.js';
import { promocionesDeFuente, categoriasDeFuente } from '../../backend/catalogo.js';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };

// H24 con datos reales (solo lectura): Supabase sirve el mismo catálogo que la fuente única y que el mock.
test('H24 Supabase contiene las promociones de la fuente con sus campos nuevos, sucursales y cobertura', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const ids = new Set(fuente.promociones.map(promo => promo.id));
  const remoto = (await obtenerRepositorio().listarPromocionesConBeneficios()).filter(promo => ids.has(promo.id));
  const local = promocionesDeFuente(fuente);
  const ahora = new Date();
  for (const tarjeta of ['basica', 'black']) {
    assert.deepEqual(filtrarPromociones(remoto, tarjeta, [], ahora), filtrarPromociones(local, tarjeta, [], ahora), tarjeta);
  }
});

test('H24 Supabase entrega las categorías de la fuente con icono y subcategorías', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const ids = new Set(fuente.categorias.map(categoria => categoria.id));
  const remotas = (await obtenerRepositorioPreferencias().obtenerCategorias()).filter(categoria => ids.has(categoria.id));
  assert.deepEqual(remotas, categoriasDeFuente(fuente));
});
