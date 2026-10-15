import test from 'node:test';
import assert from 'node:assert/strict';
import actividad from '../../api/auth/actividad.js';
import login from '../../api/auth/login.js';
import sesion from '../../api/auth/sesion.js';
import { crearToken } from '../../backend/servicios/sesion.js';
process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'i'.repeat(40);
const request = (method, cookie) => new Request('http://localhost/api/auth/actividad', { method, headers: cookie ? {cookie} : {} });
test('actividad solo acepta POST y rechaza sesiones ausentes o inactivas', async () => {
  assert.equal((await actividad.fetch(request('GET'))).status, 405);
  assert.equal((await actividad.fetch(request('POST'))).status, 401);
  const cookie = 'sesion_extras=' + crearToken('A', Date.now() - 121000);
  assert.equal((await actividad.fetch(request('POST', cookie))).status, 401);
  assert.equal((await actividad.fetch(new Request('http://localhost/api/auth/actividad', {method:'POST',headers:{origin:'https://ajeno.example'}}))).status,403);
});
test('login registra plazo y actividad renueva sin devolver credenciales', async () => {
  const response = await login.fetch(new Request('http://localhost/api/auth/login', {method:'POST',body:JSON.stringify({usuario:'demo.basica',contrasena:'Basica2026'})}));
  const cookie = response.headers.getSetCookie()[0].split(';')[0];
  const data = await response.json();
  assert.equal(data.sesion.inactivaEn - data.sesion.ahora, 120000);
  const renewed = await actividad.fetch(request('POST', cookie));
  assert.equal(renewed.status, 200);
  assert.equal(renewed.headers.get('cache-control'), 'no-store');
  assert.equal((await renewed.json()).perfil.id, 'A');
  assert.equal((await sesion.fetch(request('GET', cookie))).status, 200);
});
