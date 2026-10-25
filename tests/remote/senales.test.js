import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerRepositorioSenales, obtenerRepositorioPreferencias } from '../../backend/repositorios/index.js';
import { obtenerClienteSupabase } from '../../backend/config/supabase.js';

// H22 con datos reales: requiere la migración 20261023013727_h22_senales_usuario aplicada.
// Usa una señal propia de prueba sobre el perfil B y la borra al terminar; no cambia preferencias ni otras señales.
const PRUEBA = { clase: 'rechazo', ambito: 'oferta', valor: 'h22-prueba-remota', origen: 'tarjeta' };

test('H22 Supabase copió las categorías de preferencias_usuario al registro de señales', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const { data, error } = await obtenerClienteSupabase().from('preferencias_usuario').select('usuario_id').eq('encuesta_completada', true).limit(1);
  assert.ifError(error);
  if (!data.length) return;
  const usuario = data[0].usuario_id;
  const { categories } = await obtenerRepositorioPreferencias().obtenerPreferencias(usuario);
  const activas = await obtenerRepositorioSenales().listarActivas(usuario);
  const declaradas = activas.filter(s => s.clase === 'interes' && s.ambito === 'categoria').map(s => s.valor);
  assert.deepEqual([...declaradas].sort(), [...categories].sort());
});

test('H22 Supabase crea, desactiva y reactiva una señal propia', async () => {
  assert.equal(process.env.DATA_SOURCE, 'supabase');
  const repo = obtenerRepositorioSenales();
  try {
    const creada = await repo.activar('B', PRUEBA);
    assert.equal(creada.activa, true);
    assert.equal((await repo.cambiarEstado('B', creada.id, false)).activa, false);
    assert.ok(!(await repo.listarActivas('B')).some(s => s.id === creada.id));
    assert.equal((await repo.activar('B', PRUEBA)).id, creada.id);
    assert.equal(await repo.cambiarEstado('A', creada.id, false), null);
  } finally {
    await obtenerClienteSupabase().from('senales_usuario').delete().eq('usuario_id', 'B').eq('valor', PRUEBA.valor);
  }
});
