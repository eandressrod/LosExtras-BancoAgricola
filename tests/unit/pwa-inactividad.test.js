import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoInactividad, plazoLocal } from '../../public/pwa/inactividad-modelo.js';
import { crearToken, datosDeToken } from '../../backend/servicios/sesion.js';
import { estadoDeSesion } from '../../backend/servicios/autenticacion.js';
import * as repo from '../../backend/repositorios/accesos.mock.js';

process.env.SESSION_SECRET = 'i'.repeat(40);
test('avisa a los 100 segundos y vence exactamente a los 120', () => {
  assert.equal(estadoInactividad(120000, 99999).estado, 'activa');
  assert.deepEqual(estadoInactividad(120000, 100000), { estado: 'aviso', segundos: 20 });
  assert.deepEqual(estadoInactividad(120000, 120000), { estado: 'vencida', segundos: 0 });
});
test('usa tiempo del servidor y nunca excede el vencimiento absoluto', () => {
  assert.equal(plazoLocal({ ahora: 1000, inactivaEn: 121000, expiraEn: 50000 }, 8000), 57000);
});
test('la sesión expirada no se revive aunque su primera petición pida renovar', async () => {
  const token = crearToken('A', Date.now() - 121000);
  assert.equal(await estadoDeSesion(token, repo, true), null);
});
test('leer sesión no renueva; actividad sí, sin cambiar el límite absoluto', async () => {
  const token = crearToken('A', Date.now() - 30000);
  const inicial = await estadoDeSesion(token, repo);
  const lectura = await estadoDeSesion(token, repo);
  assert.equal(lectura.sesion.inactivaEn, inicial.sesion.inactivaEn);
  const renovada = await estadoDeSesion(token, repo, true);
  assert.ok(renovada.sesion.inactivaEn > inicial.sesion.inactivaEn);
  assert.equal(renovada.sesion.expiraEn, datosDeToken(token).expiraEn * 1000);
});
test('una sesión revocada no admite actividad y otra del mismo usuario sigue válida', async () => {
  const token = crearToken('A');
  await repo.revocarSesion(datosDeToken(token));
  assert.equal(await estadoDeSesion(token, repo, true), null);
  assert.equal((await estadoDeSesion(crearToken('A'), repo)).perfil.id, 'A');
});
