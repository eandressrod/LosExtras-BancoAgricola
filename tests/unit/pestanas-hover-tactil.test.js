import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('SCRUM-151 el hover de las pestañas solo se aplica en dispositivos con puntero, no en táctiles', async () => {
  const css = await readFile(new URL('../../public/css/promociones-sistema.css', import.meta.url), 'utf8');
  const regla = css.indexOf('.pr-pestana:hover');
  assert.notEqual(regla, -1, 'la regla .pr-pestana:hover debe existir');
  const inicioMedia = css.lastIndexOf('@media', regla);
  assert.notEqual(inicioMedia, -1, 'la regla debe estar dentro de un @media');
  const apertura = css.indexOf('{', inicioMedia);
  assert.match(css.slice(inicioMedia, apertura), /\(hover:\s*hover\)/, 'el @media debe ser (hover: hover)');
  const dentro = css.slice(apertura + 1, regla);
  assert.equal(dentro.split('{').length - dentro.split('}').length, 0, 'la regla debe estar dentro de ese bloque');
});
