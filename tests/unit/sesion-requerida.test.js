// H22: validación de sesión común para los handlers nuevos (la migración de los demás es T3, SCRUM-130).
import test from 'node:test';
import assert from 'node:assert/strict';
import { exigirPerfil } from '../../backend/http.js';
import * as accesos from '../../backend/repositorios/accesos.mock.js';
import { crearToken } from '../../backend/servicios/sesion.js';

process.env.SESSION_SECRET = 'h22-sesion-requerida'.repeat(3);

test('H22 con sesión válida entrega el perfil del dueño', async () => {
  const request = new Request('http://local/api/para-ti', { headers: { cookie: `sesion_extras=${crearToken('A')}` } });
  const { perfil, respuesta } = await exigirPerfil(request, accesos);
  assert.equal(respuesta, undefined);
  assert.deepEqual(perfil, { id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' });
});

test('H22 sin sesión o con cookie alterada responde 401 con el mensaje de siempre', async () => {
  for (const cookie of [undefined, 'sesion_extras=alterada']) {
    const request = new Request('http://local/api/para-ti', { headers: cookie ? { cookie } : {} });
    const { perfil, respuesta } = await exigirPerfil(request, accesos);
    assert.equal(perfil, undefined);
    assert.equal(respuesta.status, 401);
    assert.equal(respuesta.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await respuesta.json(), { error: 'Inicia sesión para continuar.' });
  }
});
