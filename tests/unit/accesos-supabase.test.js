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

test('revocación consulta su identificador y un fallo no se interpreta como sesión activa', async () => {
  const consultas = [];
  const repo = crearRepositorioAccesosSupabase(clienteFalso({ data: { id: 'sesion' }, error: null }, consultas));
  assert.equal(await repo.sesionRevocada('sesion'), true);
  assert.equal(consultas[0].tabla, 'sesiones_revocadas');
  assert.deepEqual(consultas[0].filtros, [['id', 'sesion']]);
  const sinFila = crearRepositorioAccesosSupabase(clienteFalso({ data: null, error: null }, []));
  assert.equal(await sinFila.sesionRevocada('sesion'), false);
  const fallido = crearRepositorioAccesosSupabase(clienteFalso({ data: null, error: { message: 'detalle privado' } }, []));
  await assert.rejects(fallido.sesionRevocada('sesion'), error => !error.message.includes('detalle privado'));
});

test('guardar revocación es idempotente y no silencia un error de escritura', async () => {
  let escritura;
  const client = { from(tabla) { return { async upsert(fila, opciones) {
    escritura = { tabla, fila, opciones };
    return { error: null };
  } }; } };
  const repo = crearRepositorioAccesosSupabase(client);
  await repo.revocarSesion({ id: 'sesion', perfilId: 'A', expiraEn: 2000000000 });
  assert.deepEqual(escritura, {
    tabla: 'sesiones_revocadas',
    fila: { id: 'sesion', usuario_id: 'A', expira_en: new Date(2000000000 * 1000).toISOString() },
    opciones: { onConflict: 'id', ignoreDuplicates: true }
  });
  const fallido = crearRepositorioAccesosSupabase({ from() { return { async upsert() { return { error: { message: 'detalle privado' } }; } }; } });
  await assert.rejects(fallido.revocarSesion({ id: 'sesion', perfilId: 'A', expiraEn: 2000000000 }), error => !error.message.includes('detalle privado'));
});
