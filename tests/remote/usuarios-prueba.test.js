import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { obtenerClienteSupabase } from '../../backend/config/supabase.js';
import { generarHash } from '../../backend/servicios/contrasenas.js';
import perfiles from '../../api/perfiles.js';
import login from '../../api/auth/login.js';
import apertura from '../../backend/handlers/promociones-apertura.js';

process.env.SESSION_SECRET ||= randomBytes(32).toString('hex');

test('login remoto: un perfil creado en la base aparece en el selector, cambia de clave y la apertura pertenece a la sesión sin completar encuesta', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const cliente = obtenerClienteSupabase();
  const id = 'qa-login-' + randomUUID();
  const lista = async () => { const r = await perfiles.fetch(new Request('http://localhost/api/perfiles?testing=1')); assert.equal(r.status, 200); return r.json(); };
  const originales = (await lista()).map(p => p.id).sort();
  const entrar = clave => login.fetch(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: id, contrasena: clave }) }));
  const exito = r => { assert.equal(r.error, null); return r.data; };
  const cambiarClave = async clave => exito(await cliente.from('perfiles').update({ contrasena_hash: generarHash(clave), clave_prueba: clave }).eq('id', id));
  try {
    exito(await cliente.from('perfiles').insert({ id, nombre: 'QA Login', tipo_tarjeta: 'basica', usuario_acceso: id,
      contrasena_hash: generarHash('PruebaLogin2026'), clave_prueba: 'PruebaLogin2026' }));
    exito(await cliente.from('preferencias_usuario').insert({ usuario_id: id, categorias: [], encuesta_completada: false }));
    let p = (await lista()).find(p => p.id === id);
    assert.equal(p.clavePrueba, 'PruebaLogin2026'); assert.equal(p.promocionesAbiertas, false);
    assert.ok(!('contrasena_hash' in p));
    assert.equal((await entrar(p.clavePrueba)).status, 200);
    await cambiarClave('CambioLogin2026');
    p = (await lista()).find(p => p.id === id); assert.equal(p.clavePrueba, 'CambioLogin2026');
    assert.equal((await entrar('PruebaLogin2026')).status, 401);
    const acceso = await entrar(p.clavePrueba); assert.equal(acceso.status, 200);
    const cookie = acceso.headers.getSetCookie()[0].split(';')[0];
    for (let i = 0; i < 2; i++) {
      const r = await apertura.fetch(new Request('http://localhost/api/promociones-apertura', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ perfilId: 'A' }) }));
      assert.equal(r.status, 200);
    }
    assert.equal((await lista()).find(p => p.id === id).promocionesAbiertas, true);
    const estado = exito(await cliente.from('preferencias_usuario').select('encuesta_completada').eq('usuario_id', id).single());
    assert.equal(estado.encuesta_completada, false);
  } finally {
    // Retirar exclusivamente el registro temporal y lo que lo referencia sin borrado en cascada.
    for (const tabla of ['promociones_guardadas', 'sesiones_revocadas', 'preferencias_usuario']) {
      exito(await cliente.from(tabla).delete().eq('usuario_id', id));
    }
    exito(await cliente.from('perfiles').delete().eq('id', id));
    assert.deepEqual((await lista()).map(p => p.id).sort(), originales);
  }
});
