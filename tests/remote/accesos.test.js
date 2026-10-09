import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import login from '../../api/auth/login.js';
import sesion from '../../api/auth/sesion.js';

// Solo firma la cookie dentro de esta prueba; no modifica datos en Supabase.
process.env.SESSION_SECRET ||= randomBytes(32).toString('base64url');

test('Supabase valida los accesos A y B y la sesión devuelve su tipo de tarjeta', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase', 'DATA_SOURCE debe ser supabase en esta verificación.');
  for (const [usuario, contrasena, tipoTarjeta] of [['demo.basica', 'Basica2026', 'basica'], ['demo.black', 'Black2026', 'black']]) {
    const respuesta = await login.fetch(new Request('http://localhost/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario, contrasena })
    }));
    assert.equal(respuesta.status, 200, `Login de ${usuario}: comprobar que la migración de accesos esté aplicada.`);
    const cookie = respuesta.headers.getSetCookie()[0].split(';')[0];
    const actual = await sesion.fetch(new Request('http://localhost/api/auth/sesion', { headers: { cookie } }));
    assert.equal((await actual.json()).perfil.tipoTarjeta, tipoTarjeta);
  }
});
