import test from 'node:test';
import assert from 'node:assert/strict';
import * as configuracion from '../../backend/config/supabase.js';

const leerConfiguracionSupabase = datos => configuracion.leerConfiguracionSupabase(datos);

const valido = {
  SUPABASE_URL: 'https://ejemplo.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_solo_para_prueba'
};

test('configuración completa devuelve URL y clave para backend', () => {
  assert.deepEqual(leerConfiguracionSupabase(valido), {
    url: valido.SUPABASE_URL, key: valido.SUPABASE_SECRET_KEY
  });
});

test('faltan variables: error sin mostrar secretos', () => {
  for (const campo of Object.keys(valido)) {
    assert.throws(() => leerConfiguracionSupabase({ ...valido, [campo]: '' }),
      /Falta configurar/);
  }
});

test('URL inválida devuelve un error claro', () => {
  assert.throws(() => leerConfiguracionSupabase({ ...valido, SUPABASE_URL: 'no-es-url' }),
    /SUPABASE_URL/);
});

test('conexión remota exige HTTPS', () => {
  assert.throws(() => leerConfiguracionSupabase({ ...valido, SUPABASE_URL: 'http://ejemplo.supabase.co' }),
    /HTTPS/);
});

test('desarrollo con Supabase local permite HTTP en loopback', () => {
  assert.equal(leerConfiguracionSupabase({ ...valido, SUPABASE_URL: 'http://127.0.0.1:54321' }).url,
    'http://127.0.0.1:54321');
});

test('una clave publishable no sustituye la clave privada del backend', () => {
  assert.throws(() => leerConfiguracionSupabase({ ...valido, SUPABASE_SECRET_KEY: 'sb_publishable_prueba' }),
    /clave privada/);
});
