// SCRUM-150: una promoción que ya no existe (enlace viejo o retirada del catálogo) no ofrece un «Reintentar» que nunca funciona.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirDetalle } from './pagina-promociones.js';

const conEstado = estado => Object.assign(new Error('No se pudieron cargar los datos. Intenta de nuevo.'), { status: estado });

test('SCRUM-150 una promoción inexistente dice que ya no está disponible y ofrece volver, sin Reintentar', async () => {
  const p = await abrirDetalle({ search: '?id=no-existe', error: conEstado(404) });
  assert.equal(p.obtener('#detail-status').textContent, 'Esta promoción ya no está disponible.');
  assert.equal(p.obtener('#retry').hidden, true);
  assert.equal(p.obtener('#detail').hidden, true);
  assert.equal(p.obtener('#back-to-list').hidden, false);
  assert.equal(p.volver(), '/promociones.html');
});

test('SCRUM-150 un fallo de conexión o del servidor sigue ofreciendo Reintentar', async () => {
  for (const error of [conEstado(503), new Error('No se pudieron cargar los datos. Intenta de nuevo.')]) {
    const p = await abrirDetalle({ search: '?id=tienda', error });
    assert.equal(p.obtener('#detail-status').textContent, 'No se pudieron cargar los datos. Intenta de nuevo.');
    assert.equal(p.obtener('#retry').hidden, false);
  }
});
