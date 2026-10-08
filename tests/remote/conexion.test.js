import test from 'node:test';
import assert from 'node:assert/strict';
import perfiles from '../../api/perfiles.js';
import promociones from '../../api/promociones.js';
import promocion from '../../api/promocion.js';

test('la conexión remota está seleccionada y configurada', () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase', 'DATA_SOURCE debe ser supabase; no se acepta mock en esta verificación.');
  assert.ok(process.env.SUPABASE_URL, 'Falta SUPABASE_URL.');
  assert.ok(process.env.SUPABASE_SECRET_KEY, 'Falta SUPABASE_SECRET_KEY en .env local.');
});

test('API y Supabase devuelven perfiles y catálogo reales con detalle coherente', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const respuestaPerfiles = await perfiles.fetch(new Request('http://localhost/api/perfiles'));
  assert.equal(respuestaPerfiles.status, 200, 'La consulta remota de perfiles debe completar correctamente.');
  const datosPerfiles = await respuestaPerfiles.json();
  assert.ok(datosPerfiles.some(perfil => perfil.id === 'A'));
  assert.ok(datosPerfiles.some(perfil => perfil.id === 'B'));
  const respuestaLista = await promociones.fetch(new Request('http://localhost/api/promociones'));
  assert.equal(respuestaLista.status, 200);
  const lista = await respuestaLista.json();
  assert.ok(lista.length > 0);
  for (const item of lista) {
    const respuestaDetalle = await promocion.fetch(new Request(`http://localhost/api/promocion?id=${encodeURIComponent(item.id)}`));
    assert.equal(respuestaDetalle.status, 200);
    assert.deepEqual(await respuestaDetalle.json(), item);
  }
});
