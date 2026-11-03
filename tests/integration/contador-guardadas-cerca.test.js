import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, almacen } from './pagina-promociones.js';
import { guardarSeccion } from '../../public/js/pestanas.js';

const respuestaJson = datos => ({ ok: true, status: 200, json: async () => datos });

test('SCRUM-145 si Promociones abre en Cerca de ti, el icono de Guardadas muestra su número', async () => {
  const sesion = almacen();
  guardarSeccion(sesion, 'A', 'cerca');
  const p = await abrirListado({
    sesion,
    fetch: async url => respuestaJson(url === '/api/guardadas' ? { ids: ['restaurante', 'tienda', 'cine'] } : {})
  });
  await new Promise(resolver => setImmediate(resolver));
  assert.equal(p.obtener('#pr-contador-guardadas').textContent, '3');
});
