import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { obtenerClienteSupabase } from '../../backend/config/supabase.js';
import { crearServicioMidi } from '../../hola/servicio.js';
import { crearBorrador, generarPerfil } from '../../hola/modelo.js';
import perfiles from '../../api/perfiles.js';
import login from '../../api/auth/login.js';
import apertura from '../../backend/handlers/promociones-apertura.js';

process.env.SESSION_SECRET ||= randomBytes(32).toString('hex');

test('login remoto: Midi crea/cambia credenciales, selector incluye el perfil y apertura pertenece a la sesión sin completar encuesta', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const cliente = obtenerClienteSupabase();
  let ahora = Date.now();
  const servicio = crearServicioMidi(cliente, { reloj: () => ahora });
  const id = 'qa-login-' + randomUUID();
  const originales = (await servicio.leer()).datos.perfiles.map(p => p.id).sort();
  const guardar = async borrador => { ahora += 2001; return (await servicio.guardar(randomUUID(), borrador.cambios())).datos; };
  const lista = async () => { const r = await perfiles.fetch(new Request('http://localhost/api/perfiles?testing=1')); assert.equal(r.status, 200); return r.json(); };
  const entrar = clave => login.fetch(new Request('http://localhost/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usuario: id, contrasena: clave }) }));
  try {
    const b = crearBorrador((await servicio.leer()).datos);
    const filas = generarPerfil(() => 0, b.filas);
    Object.assign(filas.perfiles[0], { id, nombre: 'QA Login', usuario_acceso: id, contrasena: 'PruebaLogin2026' });
    filas.preferencias_usuario[0].usuario_id = id;
    b.agregar(filas);
    let datos = await guardar(b);
    let p = (await lista()).find(p => p.id === id);
    assert.equal(p.clavePrueba, 'PruebaLogin2026'); assert.equal(p.promocionesAbiertas, false);
    assert.ok(!('contrasena_hash' in p));
    assert.equal((await entrar(p.clavePrueba)).status, 200);
    const cambio = crearBorrador(datos);
    cambio.filas.perfiles.find(p => p.id === id).contrasena = 'CambioLogin2026';
    datos = await guardar(cambio);
    p = (await lista()).find(p => p.id === id); assert.equal(p.clavePrueba, 'CambioLogin2026');
    assert.equal((await entrar('PruebaLogin2026')).status, 401);
    const acceso = await entrar(p.clavePrueba); assert.equal(acceso.status, 200);
    const cookie = acceso.headers.getSetCookie()[0].split(';')[0];
    for (let i = 0; i < 2; i++) {
      const r = await apertura.fetch(new Request('http://localhost/api/promociones-apertura', { method: 'POST', headers: { cookie, 'Content-Type': 'application/json' }, body: JSON.stringify({ perfilId: 'A' }) }));
      assert.equal(r.status, 200);
    }
    assert.equal((await lista()).find(p => p.id === id).promocionesAbiertas, true);
    const estado = await cliente.from('preferencias_usuario').select('encuesta_completada').eq('usuario_id', id).single();
    assert.equal(estado.error, null); assert.equal(estado.data.encuesta_completada, false);
  } finally {
    // Retirar exclusivamente el registro temporal, con sus versiones/dependencias actuales.
    const r = await cliente.rpc('midi_leer_datos'); assert.equal(r.error, null);
    const p = r.data.perfiles.find(p => p.id === id);
    if (p) { const b = crearBorrador(r.data); b.eliminar('perfiles', p); await guardar(b); }
    const finales = await lista();
    assert.deepEqual(finales.map(p => p.id).sort(), originales);
  }
});
