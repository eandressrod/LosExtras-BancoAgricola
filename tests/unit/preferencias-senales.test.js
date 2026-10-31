// H22: /api/preferencias conserva su contrato y además refleja las categorías en el registro de señales (ADR-009).
import test from 'node:test';
import assert from 'node:assert/strict';
import { validarYGuardarPreferencias } from '../../backend/servicios/preferencias.js';

const repo = (registro) => ({
  obtenerCategorias: async () => [{ id: 'Compras' }, { id: 'Salud' }],
  guardarPreferencias: async (usuario, categorias) => { registro.push(['preferencias', usuario, categorias]); }
});

test('H22 guardar preferencias sincroniza interés·categoría con origen encuesta después de guardarlas', async () => {
  const registro = [];
  const senales = { sincronizarCategorias: async (usuario, categorias, origen) => { registro.push(['senales', usuario, categorias, origen]); } };
  await validarYGuardarPreferencias('A', ['Compras', 'Salud'], repo(registro), senales);
  assert.deepEqual(registro, [['preferencias', 'A', ['Compras', 'Salud']], ['senales', 'A', ['Compras', 'Salud'], 'encuesta']]);
});

test('SCRUM-113 las señales reciben las categorías repetidas una sola vez, igual que las preferencias', async () => {
  const registro = [];
  const senales = { sincronizarCategorias: async (usuario, categorias, origen) => { registro.push(['senales', usuario, categorias, origen]); } };
  await validarYGuardarPreferencias('A', ['Compras', 'Salud', 'Compras'], repo(registro), senales);
  assert.deepEqual(registro, [['preferencias', 'A', ['Compras', 'Salud']], ['senales', 'A', ['Compras', 'Salud'], 'encuesta']]);
});

test('H22 una selección inválida no toca preferencias ni señales', async () => {
  const registro = [];
  const senales = { sincronizarCategorias: async () => { registro.push('senales'); } };
  await assert.rejects(validarYGuardarPreferencias('A', ['Mascotas'], repo(registro), senales), /inválida/);
  await assert.rejects(validarYGuardarPreferencias('A', [], repo(registro), senales), /Selecciona/);
  assert.deepEqual(registro, []);
});
