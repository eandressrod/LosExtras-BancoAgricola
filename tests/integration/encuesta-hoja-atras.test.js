import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as modelo from '../../public/js/encuesta-modelo.js';
import { ordenarParaTi } from '../../public/js/motor/index.js';
import { controlarAtras } from '../../public/js/cerca/atras.js';

// SCRUM-141: el «atrás» del sistema con la encuesta abierta cierra la hoja (como «Omitir») y se queda en Promociones.
// La hoja se ejecuta sin sus imports, con un DOM mínimo: cada nodo acepta cualquier método y recuerda sus propiedades.
function nodo() {
  const datos = { hidden: false, textContent: '', dataset: {}, style: {}, hijos: new Map() };
  return new Proxy(datos, {
    get(objetivo, clave) {
      if (clave in objetivo) return objetivo[clave];
      if (typeof clave === 'symbol') return undefined;
      if (clave === 'classList') return (objetivo.classList = { add() {}, remove() {}, toggle() {}, contains: () => false });
      if (clave === 'querySelector') return selector => {
        if (!objetivo.hijos.has(selector)) objetivo.hijos.set(selector, nodo());
        return objetivo.hijos.get(selector);
      };
      if (clave === 'querySelectorAll') return () => [];
      return () => {};
    },
    set(objetivo, clave, valor) { objetivo[clave] = valor; return true; }
  });
}

async function abrirHoja() {
  const fuente = (await readFile(new URL('../../public/js/encuesta-hoja.js', import.meta.url), 'utf8'))
    .replace(/^import\s*\{[^}]*\}\s*from\s*['"][^'"]+['"]\s*;?\s*\n/gms, '').replace(/^import[^\n]+\n/gm, '')
    .replaceAll('export function', 'function');
  const hoja = nodo();
  const documento = nodo();
  documento.querySelector = selector => (selector === '#survey-sheet' ? hoja : nodo());
  documento.createElement = () => nodo();
  const historial = { state: { filtros: 'Compras' }, entradas: 0, atras: 0, pushState(estado) { this.state = estado; this.entradas += 1; }, back() { this.atras += 1; } };
  const ventana = {};
  const cierres = [];
  const contexto = {
    ...modelo, ordenarParaTi, controlarAtras, document: documento, history: historial, setTimeout, clearTimeout,
    getComputedStyle: () => ({ fontSize: '16px' }),
    addEventListener(tipo, accion) { ventana[tipo] = accion; },
    removeEventListener(tipo, accion) { if (ventana[tipo] === accion) delete ventana[tipo]; },
    getJSON: async () => ({ senales: [] })
  };
  vm.runInNewContext(fuente + '\nglobalThis.abrirEncuestaHoja = abrirEncuestaHoja;', contexto);
  await contexto.abrirEncuestaHoja({
    perfil: { id: 'A' }, lista: [], categorias: [], mostrarVistaPrevia() {},
    alCerrar: cierre => { cierres.push(cierre); }
  });
  return { hoja, historial, ventana, cierres, omitir: () => hoja.querySelector('#survey-skip').onclick() };
}

test('abrir la encuesta añade una entrada al historial y Atrás cierra la hoja sin salir de Promociones', async () => {
  const p = await abrirHoja();
  assert.equal(p.hoja.hidden, false);
  assert.equal(p.historial.entradas, 1, 'la hoja registra su paso en el historial');
  assert.equal(p.historial.state.filtros, 'Compras', 'conserva el estado de la página');
  p.ventana.popstate();
  assert.equal(p.hoja.hidden, true);
  assert.deepEqual(p.cierres.map(cierre => cierre.terminada), [false], 'Atrás cierra como «Omitir»');
  assert.equal(p.historial.atras, 0, 'el sistema ya retrocedió');
});

test('cerrar con Omitir deshace la entrada añadida y un Atrás posterior ya no cierra nada', async () => {
  const p = await abrirHoja();
  p.omitir();
  assert.equal(p.hoja.hidden, true);
  assert.equal(p.historial.atras, 1, 'Omitir retira la entrada de la hoja');
  assert.equal(p.ventana.popstate, undefined, 'la hoja deja de escuchar el historial');
  assert.equal(p.cierres.length, 1);
});
