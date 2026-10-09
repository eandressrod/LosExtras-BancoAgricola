import test from 'node:test';
import assert from 'node:assert/strict';
import { crearRepositorioAccesosSupabase } from '../../backend/repositorios/accesos.supabase.js';

// Cliente mínimo con la misma cadena de consulta que usa el repositorio.
function clienteFalso(respuesta, consultas) {
  return {
    from(tabla) {
      const consulta = { tabla, filtros: [] };
      consultas.push(consulta);
      const builder = {
        select(campos) { consulta.campos = campos; return builder; },
        eq(campo, valor) { consulta.filtros.push([campo, valor]); return builder; },
        async maybeSingle() { return respuesta; }
      };
      return builder;
    }
  };
}

const filaB = { id: 'B', nombre: 'Usuario B', tipo_tarjeta: 'black', contrasena_hash: 'scrypt$sal$clave' };

test('el acceso se busca por usuario_acceso y se traduce al contrato del backend', async () => {
  const consultas = [];
  const repo = crearRepositorioAccesosSupabase(clienteFalso({ data: filaB, error: null }, consultas));
  assert.deepEqual(await repo.buscarAccesoPorUsuario('demo.black'),
    { id: 'B', nombre: 'Usuario B', tipoTarjeta: 'black', contrasenaHash: 'scrypt$sal$clave' });
  assert.equal(consultas[0].tabla, 'perfiles');
  assert.deepEqual(consultas[0].filtros, [['usuario_acceso', 'demo.black']]);
});

test('el perfil de sesión no pide ni devuelve credenciales', async () => {
  const consultas = [];
  const repo = crearRepositorioAccesosSupabase(clienteFalso({ data: filaB, error: null }, consultas));
  assert.deepEqual(await repo.buscarPerfilPorId('B'), { id: 'B', nombre: 'Usuario B', tipoTarjeta: 'black' });
  assert.ok(!consultas[0].campos.includes('contrasena'));
  assert.deepEqual(consultas[0].filtros, [['id', 'B']]);
});

test('sin fila devuelve null; un error de Supabase se convierte en error controlado', async () => {
  const vacio = crearRepositorioAccesosSupabase(clienteFalso({ data: null, error: null }, []));
  assert.equal(await vacio.buscarAccesoPorUsuario('nadie'), null);
  assert.equal(await vacio.buscarPerfilPorId('Z'), null);
  const fallido = crearRepositorioAccesosSupabase(clienteFalso({ data: null, error: { message: 'detalle interno' } }, []));
  await assert.rejects(fallido.buscarAccesoPorUsuario('demo.black'), error => !error.message.includes('detalle interno'));
  await assert.rejects(fallido.buscarPerfilPorId('B'), error => !error.message.includes('detalle interno'));
});
