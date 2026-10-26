// H22: repositorio de señales. El mock y Supabase cumplen el mismo contrato (ADR-007).
import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRepositorioSenalesMock, reiniciarSenalesMock } from '../../backend/repositorios/senales.mock.js';
import { crearRepositorioSenalesSupabase } from '../../backend/repositorios/senales.supabase.js';
import fixtures from '../../backend/datos-menu.json' with { type: 'json' };

const interes = (ambito, valor, origen = 'encuesta') => ({ clase: 'interes', ambito, valor, origen });
const resumen = senales => senales.map(({ clase, ambito, valor, origen, activa }) => ({ clase, ambito, valor, origen, activa }));

test('H22 el mock deriva sus señales iniciales de las preferencias de prueba, sin copiarlas a mano', async () => {
  reiniciarSenalesMock();
  const repo = crearRepositorioSenalesMock();
  for (const { usuarioId, categorias, completada } of fixtures.preferencias) {
    const esperadas = completada ? categorias.map(valor => ({ ...interes('categoria', valor), activa: true })) : [];
    assert.deepEqual(resumen(await repo.listarActivas(usuarioId)), esperadas, usuarioId);
  }
});

test('H22 activar crea o reactiva la misma señal; desactivar la saca de las activas', async () => {
  reiniciarSenalesMock();
  const repo = crearRepositorioSenalesMock();
  const creada = await repo.activar('A', interes('comercio', 'pizza-hut'));
  assert.equal(typeof creada.id, 'number');
  assert.equal(creada.activa, true);
  assert.ok(!Number.isNaN(Date.parse(creada.creadaEn)));
  assert.deepEqual(resumen(await repo.listarActivas('A')), [{ ...interes('comercio', 'pizza-hut'), activa: true }]);
  const desactivada = await repo.cambiarEstado('A', creada.id, false);
  assert.equal(desactivada.activa, false);
  assert.deepEqual(await repo.listarActivas('A'), []);
  const reactivada = await repo.activar('A', interes('comercio', 'pizza-hut', 'tarjeta'));
  assert.equal(reactivada.id, creada.id);
  assert.equal(reactivada.origen, 'tarjeta');
  assert.equal(reactivada.creadaEn, creada.creadaEn);
});

test('H22 cada usuario solo cambia sus propias señales', async () => {
  reiniciarSenalesMock();
  const repo = crearRepositorioSenalesMock();
  const deA = await repo.activar('A', interes('categoria', 'Compras'));
  assert.equal(await repo.cambiarEstado('B', deA.id, false), null);
  assert.equal(await repo.cambiarEstado('A', 999999, false), null);
  assert.equal((await repo.listarActivas('A')).length, 1);
  assert.deepEqual(await repo.listarActivas('B'), []);
});

test('H22 sincronizar categorías activa las elegidas y desactiva las quitadas, sin tocar otras señales', async () => {
  reiniciarSenalesMock();
  const repo = crearRepositorioSenalesMock();
  await repo.activar('A', interes('comercio', 'cine'));
  await repo.sincronizarCategorias('A', ['Compras', 'Salud'], 'encuesta');
  await repo.sincronizarCategorias('A', ['Salud', 'Restaurantes'], 'encuesta');
  assert.deepEqual(resumen(await repo.listarActivas('A')).map(s => s.valor).sort(), ['Restaurantes', 'Salud', 'cine']);
});

// Cliente mínimo con la cadena de consulta que usa el repositorio.
function clienteFalso(respuestas, consultas) {
  return {
    from(tabla) {
      const consulta = { tabla, filtros: [] };
      consultas.push(consulta);
      const resultado = () => respuestas.shift() ?? { data: [], error: null };
      const builder = {
        select(campos) { consulta.campos = campos; return builder; },
        upsert(filas, opciones) { consulta.upsert = filas; consulta.opciones = opciones; return builder; },
        update(cambios) { consulta.update = cambios; return builder; },
        eq(campo, valor) { consulta.filtros.push(['eq', campo, valor]); return builder; },
        in(campo, valores) { consulta.filtros.push(['in', campo, valores]); return builder; },
        order(campo) { consulta.orden = campo; return builder; },
        async single() { return resultado(); },
        async maybeSingle() { return resultado(); },
        then(resolver, rechazar) { return Promise.resolve(resultado()).then(resolver, rechazar); }
      };
      return builder;
    }
  };
}
const fila = { id: '7', clase: 'interes', ambito: 'categoria', valor: 'Compras', origen: 'encuesta', creada_en: '2026-10-22T10:00:00Z', activa: true };

test('H22 Supabase lee solo las activas del propietario y traduce al contrato', async () => {
  const consultas = [];
  const repo = crearRepositorioSenalesSupabase(clienteFalso([{ data: [fila], error: null }], consultas));
  assert.deepEqual(await repo.listarActivas('A'),
    [{ id: 7, clase: 'interes', ambito: 'categoria', valor: 'Compras', origen: 'encuesta', creadaEn: '2026-10-22T10:00:00Z', activa: true }]);
  assert.equal(consultas[0].tabla, 'senales_usuario');
  assert.deepEqual(consultas[0].filtros, [['eq', 'usuario_id', 'A'], ['eq', 'activa', true]]);
});

test('H22 Supabase reactiva con upsert sobre la clave única y cambia el estado filtrando por propietario', async () => {
  const consultas = [];
  const repo = crearRepositorioSenalesSupabase(clienteFalso([{ data: fila, error: null }, { data: null, error: null }], consultas));
  await repo.activar('A', interes('categoria', 'Compras'));
  assert.equal(consultas[0].opciones.onConflict, 'usuario_id,clase,ambito,valor');
  assert.equal(consultas[0].upsert.usuario_id, 'A');
  assert.equal(consultas[0].upsert.activa, true);
  assert.equal(await repo.cambiarEstado('A', 7, false), null);
  assert.deepEqual(consultas[1].filtros, [['eq', 'usuario_id', 'A'], ['eq', 'id', 7]]);
  assert.equal(consultas[1].update.activa, false);
});

test('H22 Supabase sincroniza categorías desactivando por id solo las que se quitaron', async () => {
  const consultas = [];
  const activas = [fila, { ...fila, id: '8', valor: 'Salud' }];
  const repo = crearRepositorioSenalesSupabase(clienteFalso([{ data: activas, error: null }, { data: null, error: null }, { data: null, error: null }], consultas));
  await repo.sincronizarCategorias('A', ['Compras', 'Restaurantes'], 'encuesta');
  assert.deepEqual(consultas[1].upsert.map(f => f.valor), ['Compras', 'Restaurantes']);
  assert.equal(consultas[2].update.activa, false);
  assert.deepEqual(consultas[2].filtros, [['eq', 'usuario_id', 'A'], ['in', 'id', [8]]]);
});

test('H22 un error de Supabase se convierte en un error controlado', async () => {
  const repo = crearRepositorioSenalesSupabase(clienteFalso([{ data: null, error: { message: 'detalle interno' } }], []));
  await assert.rejects(repo.listarActivas('A'), error => error.message === 'No se pudieron consultar tus intereses.');
});

test('H23 un «Menos» que quitó la elección conserva quitoEleccion; las demás señales no llevan el campo', async () => {
  reiniciarSenalesMock();
  const repo = crearRepositorioSenalesMock();
  const menos = await repo.activar('A', { clase: 'rechazo', ambito: 'comercio', valor: 'pizza-hut', origen: 'tarjeta', quitoEleccion: true });
  assert.equal(menos.quitoEleccion, true);
  const otra = await repo.activar('A', interes('categoria', 'Compras'));
  assert.equal(Object.hasOwn(otra, 'quitoEleccion'), false);
  await repo.cambiarEstado('A', menos.id, false);
  const reactivada = await repo.activar('A', { clase: 'rechazo', ambito: 'comercio', valor: 'pizza-hut', origen: 'tarjeta' });
  assert.equal(Object.hasOwn(reactivada, 'quitoEleccion'), false);
});

test('H23 Supabase guarda y traduce quito_eleccion', async () => {
  const consultas = [];
  const conQuito = { ...fila, clase: 'rechazo', ambito: 'comercio', valor: 'pizza-hut', origen: 'tarjeta', quito_eleccion: true };
  const repo = crearRepositorioSenalesSupabase(clienteFalso([{ data: conQuito, error: null }, { data: fila, error: null }], consultas));
  const menos = await repo.activar('A', { clase: 'rechazo', ambito: 'comercio', valor: 'pizza-hut', origen: 'tarjeta', quitoEleccion: true });
  assert.equal(consultas[0].upsert.quito_eleccion, true);
  assert.equal(menos.quitoEleccion, true);
  await repo.activar('A', interes('categoria', 'Compras'));
  assert.equal(consultas[1].upsert.quito_eleccion, false);
  assert.match(consultas[0].campos, /quito_eleccion/);
});
