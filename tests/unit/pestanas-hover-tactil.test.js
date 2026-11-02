import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const leerCss = ruta => readFile(new URL(`../../public/css/${ruta}`, import.meta.url), 'utf8');

/** Reglas de primer nivel (fuera de cualquier @media), con su posición en el archivo. */
function reglasDePrimerNivel(css) {
  const reglas = [];
  let profundidad = 0;
  let inicio = 0;
  for (let i = 0; i < css.length; i += 1) {
    if (css[i] === '{') {
      if (profundidad === 0) reglas.push({ selector: css.slice(inicio, i).replace(/\/\*[\s\S]*?\*\//g, '').trim(), posicion: inicio, cuerpo: '', abre: i });
      profundidad += 1;
    } else if (css[i] === '}') {
      profundidad -= 1;
      if (profundidad === 0) {
        reglas[reglas.length - 1].cuerpo = css.slice(reglas[reglas.length - 1].abre + 1, i);
        inicio = i + 1;
      }
    }
  }
  return reglas;
}

test('SCRUM-151 el hover de las pestañas solo se aplica en dispositivos con puntero, no en táctiles', async () => {
  const css = await leerCss('promociones-sistema.css');
  // La última aparición es el fondo gris; antes puede estar el reinicio para pantallas táctiles.
  const regla = css.lastIndexOf('.pr-pestana:hover');
  assert.notEqual(regla, -1, 'la regla .pr-pestana:hover debe existir');
  const inicioMedia = css.lastIndexOf('@media', regla);
  assert.notEqual(inicioMedia, -1, 'la regla debe estar dentro de un @media');
  const apertura = css.indexOf('{', inicioMedia);
  assert.match(css.slice(inicioMedia, apertura), /\(hover:\s*hover\)/, 'el @media debe ser (hover: hover)');
  const dentro = css.slice(apertura + 1, regla);
  assert.equal(dentro.split('{').length - dentro.split('}').length, 0, 'la regla debe estar dentro de ese bloque');
});

test('SCRUM-151 en pantallas táctiles la pestaña tocada no toma el fondo amarillo de button:hover', async () => {
  // styles.css pinta de amarillo cualquier botón con :hover; en táctil ese hover se queda pegado tras tocar.
  const general = await leerCss('styles.css');
  assert.match(general, /button:hover[^{]*\{[^}]*background/, 'styles.css define el fondo de button:hover');
  const css = await leerCss('promociones-sistema.css');
  const reglas = reglasDePrimerNivel(css);
  const reinicio = reglas.find(({ selector, cuerpo }) =>
    selector.split(',').map(parte => parte.trim()).includes('.pr-pestana:hover') && /background:\s*(none|transparent)/.test(cuerpo));
  assert.ok(reinicio, 'fuera de @media, .pr-pestana:hover debe dejar el fondo sin color');
  const media = reglas.find(({ selector, cuerpo }) => /^@media\s*\(hover:\s*hover\)/.test(selector) && cuerpo.includes('.pr-pestana:hover'));
  assert.ok(media, 'el fondo gris sigue dentro de @media (hover: hover)');
  assert.ok(reinicio.posicion < media.posicion, 'el reinicio va antes para que con puntero gane el fondo gris');
});
