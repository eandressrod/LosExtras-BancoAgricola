// SCRUM-150: getJSON conserva el código HTTP en el error para que cada pantalla distinga «no existe» de un fallo temporal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = (await readFile(new URL('../../public/js/comun.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '').replaceAll('export ', '');
const getJSON = (respuesta) => vm.runInNewContext(source + '\ngetJSON("/api/promocion?id=no-existe")', { fetch: async () => respuesta });

test('SCRUM-150 un 404 rechaza con el mensaje de siempre y el estado 404', async () => {
  await assert.rejects(getJSON({ ok: false, status: 404, json: async () => ({ error: 'Promoción no encontrada.' }) }),
    error => error.message === 'No se pudieron cargar los datos. Intenta de nuevo.' && error.status === 404);
});

test('SCRUM-150 un fallo del servidor conserva su estado y uno de red no trae estado', async () => {
  await assert.rejects(getJSON({ ok: false, status: 503, json: async () => ({}) }), error => error.status === 503);
  await assert.rejects(vm.runInNewContext(source + '\ngetJSON("/x")', { fetch: async () => { throw new TypeError('Failed to fetch'); } }),
    error => error.message === 'No se pudieron cargar los datos. Intenta de nuevo.' && error.status === undefined);
});
