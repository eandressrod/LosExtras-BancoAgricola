// Rendimiento: cada página pide todos sus módulos a la vez (<link rel="modulepreload">) en lugar de descubrirlos import por
// import. Si se añade un import, esta prueba falla hasta que la página lo precarga; si se quita, hasta que deja de hacerlo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';

const PUBLICO = new URL('../../public/', import.meta.url);
const leer = ruta => readFileSync(new URL('.' + ruta, PUBLICO), 'utf8');
const PAGINAS = ['index.html', 'menu.html', 'promociones.html', 'detalle.html', 'guardadas.html', 'preferencias.html'];

/** Módulos que se importan de forma estática, en profundidad, sin contar la entrada. */
function grafo(entrada, vistos = new Set()) {
  for (const [, ruta] of leer(entrada).matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]/gm)) {
    const absoluta = posix.join(posix.dirname(entrada), ruta);
    if (vistos.has(absoluta)) continue;
    vistos.add(absoluta);
    grafo(absoluta, vistos);
  }
  return vistos;
}

for (const pagina of PAGINAS) {
  test(`${pagina} precarga todo su grafo de módulos y nada más`, () => {
    const html = leer('/' + pagina);
    const entradas = [...html.matchAll(/<script type="module" src="([^"]+)"/g)].map(([, src]) => src);
    const necesarios = new Set(entradas.flatMap(entrada => [...grafo(entrada)]).filter(ruta => !entradas.includes(ruta)));
    const precargados = new Set([...html.matchAll(/<link rel="modulepreload" href="([^"]+)">/g)].map(([, href]) => href));
    assert.deepEqual([...necesarios].filter(ruta => !precargados.has(ruta)).sort(), [], 'faltan por precargar');
    assert.deepEqual([...precargados].filter(ruta => !necesarios.has(ruta)).sort(), [], 'sobran');
  });
}
