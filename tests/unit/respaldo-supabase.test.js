import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearAccesoSupabase } from '../../scripts/respaldo-datos.js';

function clienteFalso(filasPorTabla, registro = []) {
  return {
    from(tabla) {
      return {
        select() {
          const consulta = {
            orden: [],
            order(columna) { consulta.orden.push(columna); return consulta; },
            async range(desde, hasta) {
              registro.push({ tabla, desde, hasta, orden: consulta.orden });
              return { data: filasPorTabla[tabla].slice(desde, hasta + 1), error: null };
            }
          };
          return consulta;
        },
        async upsert(filas, opciones) {
          registro.push({ tabla, upsert: filas.length, opciones });
          return { error: null };
        }
      };
    }
  };
}

test('leer pagina hasta agotar filas y ordena por la clave', async () => {
  const filas = Array.from({ length: 2500 }, (_, indice) => ({ id: indice }));
  const registro = [];
  const acceso = crearAccesoSupabase(clienteFalso({ perfiles: filas }, registro), { pagina: 1000 });
  const leidas = await acceso.leer({ tabla: 'perfiles', clave: ['id'] });
  assert.equal(leidas.length, 2500);
  assert.deepEqual(registro.map(paso => paso.desde), [0, 1000, 2000]);
  assert.deepEqual(registro[0].orden, ['id']);
});

test('escribir hace upsert con la clave primaria como conflicto', async () => {
  const registro = [];
  const acceso = crearAccesoSupabase(clienteFalso({}, registro));
  await acceso.escribir({ tabla: 'promociones_guardadas', clave: ['usuario_id', 'promocion_id'] }, [{ usuario_id: 'A', promocion_id: 'x' }]);
  assert.deepEqual(registro, [{ tabla: 'promociones_guardadas', upsert: 1, opciones: { onConflict: 'usuario_id,promocion_id' } }]);
});

test('un error de Supabase se propaga con el nombre de la tabla', async () => {
  const cliente = { from: () => ({ select: () => ({ order() { return this; }, range: async () => ({ data: null, error: { message: 'sin permiso' } }) }) }) };
  await assert.rejects(crearAccesoSupabase(cliente).leer({ tabla: 'perfiles', clave: ['id'] }), /perfiles.*sin permiso/);
});
