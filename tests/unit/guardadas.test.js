import test from 'node:test';
import assert from 'node:assert/strict';
import { guardarPromocion, quitarPromocion, seleccionarGuardadasVisibles } from '../../backend/servicios/guardadas.js';
import { crearRepositorioGuardadasMemoria } from '../../backend/repositorios/guardadas.js';

function repoNuevo() {
  return crearRepositorioGuardadasMemoria({});
}

test('guardar dos veces la misma promoción deja un solo registro', async () => {
  const repo = repoNuevo();
  await guardarPromocion('A', 'restaurante', repo);
  await guardarPromocion('A', ' restaurante ', repo);
  assert.deepEqual(await repo.listar('A'), ['restaurante']);
});

test('quitar deja de estar guardada y quitar de nuevo no falla', async () => {
  const repo = repoNuevo();
  await guardarPromocion('A', 'restaurante', repo);
  assert.deepEqual(await quitarPromocion('A', 'restaurante', repo), { guardada: false });
  assert.deepEqual(await repo.listar('A'), []);
  assert.deepEqual(await quitarPromocion('A', 'restaurante', repo), { guardada: false });
});

test('la selección de A no aparece al listar B', async () => {
  const repo = repoNuevo();
  await guardarPromocion('A', 'restaurante', repo);
  await guardarPromocion('B', 'tienda', repo);
  assert.deepEqual(await repo.listar('A'), ['restaurante']);
  assert.deepEqual(await repo.listar('B'), ['tienda']);
});

test('un identificador vacío se rechaza y no escribe', async () => {
  const repo = repoNuevo();
  await assert.rejects(guardarPromocion('A', '  ', repo), error => error.message.includes('Falta el identificador'));
  assert.deepEqual(await repo.listar('A'), []);
});

test('una promoción que no existe no se guarda', async () => {
  const repo = repoNuevo();
  await assert.rejects(
    guardarPromocion('A', 'fantasma', repo, async () => false),
    error => error.message.includes('no encontrada')
  );
  assert.deepEqual(await repo.listar('A'), []);
});

test('si guardar falla, la selección anterior permanece', async () => {
  const datos = { A: ['restaurante'] };
  const repo = {
    listar: async usuarioId => datos[usuarioId].slice(),
    guardar: async () => { throw new Error('supabase caído'); }
  };
  await assert.rejects(guardarPromocion('A', 'tienda', repo));
  assert.deepEqual(datos.A, ['restaurante']);
});

test('la vista omite vencidas e ids desconocidos', () => {
  const filtradas = [
    { id: 'restaurante', canUse: true },
    { id: 'cine', canUse: false },
    { id: 'tienda', canUse: true }
  ];
  const visible = seleccionarGuardadasVisibles(filtradas, ['restaurante', 'cine', 'fantasma', 'restaurante']);
  assert.deepEqual(visible.ids, ['restaurante', 'cine', 'fantasma']);
  assert.deepEqual(visible.promociones.map(promo => promo.id), ['restaurante']);
  assert.equal(visible.sinCoincidencias, false);
});

test('sin coincidencias cuando todo lo guardado está vencido', () => {
  const visible = seleccionarGuardadasVisibles([{ id: 'cine', canUse: false }], ['cine']);
  assert.deepEqual(visible.promociones, []);
  assert.equal(visible.sinCoincidencias, true);
});

test('sin guardadas no se presenta como falta de coincidencia', () => {
  const visible = seleccionarGuardadasVisibles([{ id: 'restaurante', canUse: true }], []);
  assert.equal(visible.sinCoincidencias, false);
  assert.deepEqual(visible.promociones, []);
});
