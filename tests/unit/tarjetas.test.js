import test from 'node:test';
import assert from 'node:assert/strict';
import { tarjetasPropias, tarjetasDelUsuario, elegirTarjeta } from '../../backend/servicios/tarjetas.js';
import { crearRepositorioCuentasMock } from '../../backend/repositorios/cuentas.mock.js';

// H16: las tarjetas propias son las cuentas de tipo tarjeta del usuario; su segmento define los beneficios.
const tarjetasDe = async perfil => tarjetasPropias(await crearRepositorioCuentasMock().listarPorPerfil(perfil));
const consulta = texto => new URLSearchParams(texto);

test('H16 las tarjetas propias son las cuentas de tipo tarjeta con su segmento, en su orden', async () => {
  assert.deepEqual((await tarjetasDe('A')).map(t => [t.id, t.tipoTarjeta, t.numeroEnmascarado]), [
    ['cta-a-3', 'basica', '•••• 4821'], ['cta-a-4', 'black', '•••• 7754']
  ]);
  assert.deepEqual((await tarjetasDe('B')).map(t => [t.id, t.tipoTarjeta]), [['cta-b-2', 'black']]);
  assert.deepEqual((await tarjetasDe('demo')).map(t => t.tipoTarjeta), ['basica']);
});

test('H16 una cuenta que no es tarjeta o con segmento desconocido no se ofrece; no se exponen saldos', () => {
  const cuentas = [
    { id: 'ahorro', nombre: 'Ahorro', tipo: 'Cuenta de ahorro', segmento: 'Básica', numeroEnmascarado: '•••• 1', saldo: 10 },
    { id: 'rara', nombre: 'Oro', tipo: 'Tarjeta de Débito', segmento: 'Oro', numeroEnmascarado: '•••• 2', saldo: 20 },
    { id: 'debito', nombre: 'Débito Black', tipo: 'Tarjeta de Débito', segmento: 'Black', numeroEnmascarado: '•••• 3', saldo: 30 }
  ];
  assert.deepEqual(tarjetasPropias(cuentas), [{ id: 'debito', tipoTarjeta: 'black', nombre: 'Débito Black', numeroEnmascarado: '•••• 3' }]);
  assert.deepEqual(tarjetasPropias([]), []);
});

test('H16 un perfil sin cuentas de tarjeta (como los que crea Midi) conserva la tarjeta de su perfil', async () => {
  const ahorro = [{ id: 'ahorro', nombre: 'Ahorro', tipo: 'Cuenta de ahorro', segmento: 'Básica', numeroEnmascarado: '•••• 1' }];
  assert.deepEqual(tarjetasDelUsuario(ahorro, { tipoTarjeta: 'black' }), [{ id: null, tipoTarjeta: 'black', nombre: 'Tarjeta Black', numeroEnmascarado: null }]);
  assert.deepEqual(tarjetasDelUsuario([], { tipoTarjeta: 'basica' }).map(tarjeta => tarjeta.tipoTarjeta), ['basica']);
  assert.deepEqual(tarjetasDelUsuario([], { tipoTarjeta: 'oro' }), []);
  assert.deepEqual(tarjetasDelUsuario(await crearRepositorioCuentasMock().listarPorPerfil('A'), { tipoTarjeta: 'basica' }).map(tarjeta => tarjeta.id), ['cta-a-3', 'cta-a-4']);
});

test('H16 sin tarjeta pedida se usa la del perfil; si no coincide, la primera propia', async () => {
  const deA = await tarjetasDe('A');
  assert.equal(elegirTarjeta(deA, consulta(''), 'basica').tarjeta.id, 'cta-a-3');
  assert.equal(elegirTarjeta(deA, consulta(''), 'black').tarjeta.id, 'cta-a-4');
  assert.equal(elegirTarjeta(await tarjetasDe('B'), consulta(''), 'basica').tarjeta.id, 'cta-b-2');
});

test('H16 se puede elegir otra tarjeta propia', async () => {
  const deA = await tarjetasDe('A');
  assert.deepEqual(elegirTarjeta(deA, consulta('tarjeta=cta-a-4'), 'basica'), { ok: true, tarjeta: deA[1] });
});

test('H16 una tarjeta ajena o inexistente no se puede elegir; repetida o vacía no es válida', async () => {
  const deA = await tarjetasDe('A');
  assert.deepEqual(elegirTarjeta(deA, consulta('tarjeta=cta-b-2'), 'basica'), { ok: false, motivo: 'ajena' });
  assert.deepEqual(elegirTarjeta(deA, consulta('tarjeta=no-existe'), 'basica'), { ok: false, motivo: 'ajena' });
  assert.deepEqual(elegirTarjeta(deA, consulta('tarjeta='), 'basica'), { ok: false, motivo: 'invalida' });
  assert.deepEqual(elegirTarjeta(deA, consulta('tarjeta=cta-a-3&tarjeta=cta-a-4'), 'basica'), { ok: false, motivo: 'invalida' });
});

test('H16 sin tarjetas no hay tarjeta con la cual consultar', () => {
  assert.deepEqual(elegirTarjeta([], consulta(''), 'basica'), { ok: true, tarjeta: null });
  assert.deepEqual(elegirTarjeta([], consulta('tarjeta=cta-a-3'), 'basica'), { ok: false, motivo: 'ajena' });
});
