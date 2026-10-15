import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { obtenerClienteSupabase } from '../../backend/config/supabase.js';
import { crearToken, datosDeToken } from '../../backend/servicios/sesion.js';
import { obtenerRepositorioAccesos } from '../../backend/repositorios/index.js';
import { estadoDeSesion, cerrarSesion } from '../../backend/servicios/autenticacion.js';
process.env.SESSION_SECRET ||= randomBytes(32).toString('hex');
test('H13 remoto: leer no renueva, actividad renueva y una vencida o revocada no revive', async () => {
  assert.equal(process.env.DATA_SOURCE,'supabase');
  const repo=obtenerRepositorioAccesos();
  const token=crearToken('A'); const otro=crearToken('A');
  try {
    const inicial=await estadoDeSesion(token,repo,true);
    assert.ok(inicial.sesion.inactivaEn-inicial.sesion.ahora<=120000);
    assert.equal((await estadoDeSesion(token,repo)).sesion.inactivaEn,inicial.sesion.inactivaEn);
    assert.ok((await estadoDeSesion(token,repo,true)).sesion.inactivaEn>=inicial.sesion.inactivaEn);
    assert.equal((await estadoDeSesion(otro,repo)).perfil.id,'A');
    const r=await obtenerClienteSupabase().from('sesiones_actividad').update({ultima_actividad:new Date(Date.now()-121000).toISOString()}).eq('id',datosDeToken(token).id);
    assert.equal(r.error,null);
    assert.equal(await estadoDeSesion(token,repo,true),null);
    await cerrarSesion(otro,repo);
    assert.equal(await estadoDeSesion(otro,repo,true),null);
  } finally { await cerrarSesion(token,repo); await cerrarSesion(otro,repo); }
});
