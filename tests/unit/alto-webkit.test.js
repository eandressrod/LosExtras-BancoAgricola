import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// SCRUM-135: Safari (WebKit) da a [popover] y a <dialog> modal «height: fit-content»; con su display propio
// (grid o flex) el aviso de sesión se estira a toda la pantalla y las hojas inferiores quedan vacías.
// Cada regla base debe fijar «height: auto» para tomar solo el alto de su contenido.
async function regla(ruta, selector) {
  const css = (await readFile(new URL(ruta, import.meta.url), 'utf8')).replace(/\/\*[\s\S]*?\*\//g, '');
  const bloque = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].find(([, selectores]) => selectores.trim() === selector);
  assert.ok(bloque, `existe la regla ${selector}`);
  return bloque[2];
}

test('el aviso de sesión toma solo el alto de su contenido en Safari', async () => {
  assert.match(await regla('../../public/pwa/pwa.css', '.pwa-aviso-lectura'), /(^|;)\s*height\s*:\s*auto\s*(;|$)/);
});

test('las hojas de Filtros y zonas toman solo el alto de su contenido en Safari', async () => {
  assert.match(await regla('../../public/css/promociones-sistema.css', '.pr-hoja'), /(^|;)\s*height\s*:\s*auto\s*(;|$)/);
});
