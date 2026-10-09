import test from 'node:test';
import assert from 'node:assert/strict';

test('menu conserva identidad y consulta cuentas y encuesta por el dueño', async () => {
  const { obtenerDatosMenu } = await import('../../backend/servicios/menu.js');
  const perfil = { id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' };
  const consultas = [];
  const data = await obtenerDatosMenu(perfil, {
    async listarPorPerfil(id) { consultas.push(['cuentas', id]); return [{ id: 'cuenta-a' }]; }
  }, {
    async estaCompletada(id) { consultas.push(['encuesta', id]); return false; }
  });
  assert.deepEqual(consultas, [['cuentas', 'A'], ['encuesta', 'A']]);
  assert.deepEqual(data, { perfil, cuentas: [{ id: 'cuenta-a' }], encuestaPendiente: true, destinoPromociones: '/encuesta.html' });
});

test('encuesta completada abre Para ti y un usuario sin cuentas mantiene lista vacía', async () => {
  const { obtenerDatosMenu } = await import('../../backend/servicios/menu.js');
  const data = await obtenerDatosMenu({ id: 'B' }, { async listarPorPerfil() { return []; } }, { async estaCompletada() { return true; } });
  assert.deepEqual(data.cuentas, []);
  assert.equal(data.encuestaPendiente, false);
  assert.equal(data.destinoPromociones, '/promociones.html');
});

test('fallo de cuentas o estado de encuesta se propaga sin fabricar datos', async () => {
  const { obtenerDatosMenu } = await import('../../backend/servicios/menu.js');
  for (const fallaEncuesta of [false, true]) {
    await assert.rejects(obtenerDatosMenu({ id: 'A' }, {
      async listarPorPerfil() { if (!fallaEncuesta) throw new Error('cuentas no disponibles'); return []; }
    }, {
      async estaCompletada() { if (fallaEncuesta) throw new Error('encuesta no disponible'); return false; }
    }), /no disponible/);
  }
});
