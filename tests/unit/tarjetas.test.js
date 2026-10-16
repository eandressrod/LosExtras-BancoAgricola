import test from 'node:test';
import assert from 'node:assert/strict';
import { tarjetasPropias, tarjetasDelUsuario, elegirTarjeta } from '../../backend/servicios/tarjetas.js';
import { crearRepositorioProductosMock } from '../../backend/repositorios/productos-menu.mock.js';

// H16: las tarjetas propias son las cuentas de tipo tarjeta del usuario; su segmento define los beneficios.
const tarjetasDe = async perfil => tarjetasPropias(await crearRepositorioProductosMock().listarTarjetas(perfil));
const consulta = texto => new URLSearchParams(texto);

test('la selección de beneficios usa tarjetas con cuenta asociada y no deriva tarjetas de cuentas bancarias',()=>{
  const fila={id:'t1',cuentaId:'c1',tipoTarjeta:'black',producto:{nombre:'Black',modalidad:'crédito'},numeroEnmascarado:'•••• 6412',saldo:800};
  assert.deepEqual(tarjetasPropias([fila]),[{id:'t1',cuentaId:'c1',tipoTarjeta:'black',nombre:'Tarjeta de crédito Black',numeroEnmascarado:'•••• 6412'}]);
  assert.deepEqual(tarjetasDelUsuario([],{tipoTarjeta:'black'}),[]);
});

test('H16 las tarjetas propias son el catálogo único asociado a cuentas, en su orden', async () => {
  assert.deepEqual((await tarjetasDe('A')).map(t => [t.id, t.tipoTarjeta, t.numeroEnmascarado]), [
    ['cta-a-3', 'basica', '•••• 6411'], ['cta-a-4', 'black', '•••• 6412']
  ]);
  assert.deepEqual((await tarjetasDe('B')).map(t => [t.id, t.tipoTarjeta]), [['cta-b-2', 'black']]);
  assert.deepEqual((await tarjetasDe('demo')).map(t => t.tipoTarjeta), ['basica']);
});

test('H16 ignora cuentas o tarjetas sin asociación y no expone saldos',()=>{
  const filas=[{id:'cuenta',tipo:'Cuenta de ahorro'}, {id:'incompleta',tipoTarjeta:'black'},
    {id:'t',cuentaId:'c',tipoTarjeta:'black',nombre:'Black',numeroEnmascarado:'•••• 1111',saldo:50}];
  assert.deepEqual(tarjetasPropias(filas),[{id:'t',cuentaId:'c',tipoTarjeta:'black',nombre:'Black',numeroEnmascarado:'•••• 1111'}]);
});
test('H16 un perfil sin tarjetas asociadas queda vacío sin inventar una tarjeta del perfil',()=>{
  assert.deepEqual(tarjetasDelUsuario([],{tipoTarjeta:'black'}),[]);
  assert.deepEqual(tarjetasDelUsuario([{tipo:'Cuenta de ahorro'}],{tipoTarjeta:'basica'}),[]);
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
