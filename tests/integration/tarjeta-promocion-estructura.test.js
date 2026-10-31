import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// SCRUM-110: el enlace de la tarjeta no contiene controles; Guardar/Quitar y su aviso son hermanos del enlace.
const INTERACTIVO = /<(button|a|input|select|textarea)[\s>]|role="(alert|button)"/;

async function plantilla(pagina, id = 'promotion-card') {
  const html = await readFile(new URL(`../../public/${pagina}`, import.meta.url), 'utf8');
  const inicio = html.indexOf(`<template id="${id}">`);
  assert.notEqual(inicio, -1, `${pagina} no tiene la plantilla ${id}`);
  return html.slice(inicio, html.indexOf('</template>', inicio));
}

function partes(fragmento) {
  const apertura = fragmento.match(/<a class="promo-card[^"]*"[^>]*>/);
  assert.ok(apertura, 'la plantilla no tiene el enlace .promo-card');
  const desde = apertura.index + apertura[0].length;
  const cierre = fragmento.indexOf('</a>', desde);
  return { dentro: fragmento.slice(desde, cierre), despues: fragmento.slice(cierre + 4) };
}

for (const pagina of ['promociones.html', 'guardadas.html']) {
  test(`SCRUM-110 en ${pagina} el enlace de la tarjeta no contiene contenido interactivo`, async () => {
    const { dentro } = partes(await plantilla(pagina));
    assert.doesNotMatch(dentro, INTERACTIVO);
  });

  test(`SCRUM-110 en ${pagina} Guardar/Quitar y su aviso van después del enlace`, async () => {
    const { despues } = partes(await plantilla(pagina));
    assert.match(despues, /<button type="button" class="guardar-promo"/);
    assert.match(despues, /class="error guardar-error" role="alert"/);
  });
}
