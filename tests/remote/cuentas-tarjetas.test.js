import test from 'node:test';
import assert from 'node:assert/strict';
import { obtenerClienteSupabase } from '../../backend/config/supabase.js';

test('SCRUM-72 remoto: toda tarjeta referencia una cuenta existente de su propietario (solo lectura)', async () => {
  assert.equal(process.env.DATA_SOURCE,'supabase');
  const cliente=obtenerClienteSupabase();
  const [tarjetas,cuentas]=await Promise.all([
    cliente.from('tarjetas_usuario').select('id,perfil_id,cuenta_id'),
    cliente.from('cuentas').select('id,perfil_id')
  ]);
  assert.ifError(tarjetas.error); assert.ifError(cuentas.error);
  assert.ok(tarjetas.data.length>0);
  assert.ok(tarjetas.data.every(t=>cuentas.data.some(c=>c.id===t.cuenta_id && c.perfil_id===t.perfil_id)),
    'No se permiten tarjetas sin cuenta propia');
});
