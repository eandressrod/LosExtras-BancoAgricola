import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { crearToken, verificarToken } from '../../backend/servicios/sesion.js';
import * as autenticacion from '../../backend/servicios/autenticacion.js';

process.env.SESSION_SECRET = 'r'.repeat(40);
function repositorio(revocadas = new Set()) {
  return {
    async buscarPerfilPorId(id) { return { id, nombre: 'Usuario ' + id, tipoTarjeta: 'basica' }; },
    async sesionRevocada(id) { return revocadas.has(id); },
    async revocarSesion({ id }) { revocadas.add(id); }
  };
}

test('dos accesos del mismo perfil en el mismo instante tienen tokens distintos', () => {
  const ahora = Date.now();
  assert.notEqual(crearToken('A', ahora), crearToken('A', ahora));
});

test('una cookie antigua sin identificador único requiere iniciar sesión otra vez', () => {
  const cuerpo = Buffer.from(JSON.stringify({ pid: 'A', exp: Math.floor(Date.now() / 1000) + 7200 })).toString('base64url');
  const firma = createHmac('sha256', process.env.SESSION_SECRET).update(cuerpo).digest('base64url');
  assert.equal(verificarToken(`${cuerpo}.${firma}`), null);
});

test('revocar una sesión impide reutilizarla desde otra instancia sin cerrar las demás', async () => {
  const registros = new Set();
  const primera = repositorio(registros);
  const segunda = repositorio(registros);
  const token = crearToken('A');
  const otro = crearToken('A');
  assert.equal((await autenticacion.perfilDeSesion(token, primera)).id, 'A');
  await autenticacion.cerrarSesion(token, primera);
  assert.equal(await autenticacion.perfilDeSesion(token, segunda), null);
  assert.equal((await autenticacion.perfilDeSesion(otro, segunda)).id, 'A');
});

test('logout repetido es idempotente y un token inválido no escribe revocaciones', async () => {
  const registros = new Set();
  const repo = repositorio(registros);
  const token = crearToken('B');
  await autenticacion.cerrarSesion(token, repo);
  await autenticacion.cerrarSesion(token, repo);
  await autenticacion.cerrarSesion('B', repo);
  await autenticacion.cerrarSesion(null, repo);
  assert.equal(registros.size, 1);
});

test('un fallo de consulta de revocaciones no concede acceso al perfil', async () => {
  const repo = {
    async sesionRevocada() { throw new Error('Base no disponible'); },
    async buscarPerfilPorId() { assert.fail('no debe consultar el perfil'); }
  };
  await assert.rejects(autenticacion.perfilDeSesion(crearToken('A'), repo), /Base no disponible/);
});
