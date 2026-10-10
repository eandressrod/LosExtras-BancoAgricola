import test from 'node:test';
import assert from 'node:assert/strict';
import { validarYGuardarPreferencias } from '../../backend/servicios/preferencias.js';

test('rechaza selecciones vacías o nulas dando error (Criterio 2)', async () => {
  const repoMock = { async guardarPreferencias() { assert.fail('No debe llegar al repositorio'); } };
  
  await assert.rejects(
    validarYGuardarPreferencias('usuario-1', [], repoMock),
    /Selecciona al menos una categoría/
  );
  await assert.rejects(
    validarYGuardarPreferencias('usuario-1', null, repoMock),
    /Selecciona al menos una categoría/
  );
});

test('rechaza categorías que no existen en las opciones permitidas', async () => {
  const repoMock = { async guardarPreferencias() { assert.fail('No debe llegar al repositorio'); } };
  
  await assert.rejects(
    validarYGuardarPreferencias('usuario-1', ['Restaurantes', 'Mascotas'], repoMock),
    /Categoría inválida/
  );
});

test('guarda con éxito categorías permitidas en el repositorio aislando al propietario (Criterio 3)', async () => {
  let datosGuardados = null;
  // Mock del repositorio para simular la base de datos
  const repoMock = {
    async guardarPreferencias(usuarioId, categorias) {
      datosGuardados = { usuarioId, categorias };
    }
  };

  await validarYGuardarPreferencias('usuario-A', ['Restaurantes', 'Entretenimiento'], repoMock);

  assert.deepEqual(datosGuardados, {
    usuarioId: 'usuario-A', // El ID del dueño viene de la sesión, respetando el Criterio 3
    categorias: ['Restaurantes', 'Entretenimiento']
  });
});