// SCRUM-152: en el teléfono, la tecla Buscar del teclado («Enter») debe cerrar el teclado para dejar ver los resultados.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, abrirGuardadas } from './pagina-promociones.js';

const tecla = key => { const evento = { key, prevenido: false, preventDefault() { this.prevenido = true; } }; return evento; };

for (const [pantalla, abrir] of [['Para ti', abrirListado], ['Guardadas', abrirGuardadas]]) {
  test(`SCRUM-152 en ${pantalla} la tecla Buscar quita el foco del campo y no envía nada más`, async () => {
    const p = await abrir();
    const campo = p.elementos.get('#merchant-search');
    const buscar = tecla('Enter');
    await campo.listeners.keydown?.(buscar);
    assert.equal(campo.desenfocado, true, 'sin blur() el teclado sigue abierto');
    assert.equal(buscar.prevenido, true);
  });

  test(`SCRUM-152 en ${pantalla} las demás teclas no cierran el teclado`, async () => {
    const p = await abrir();
    const campo = p.elementos.get('#merchant-search');
    await campo.listeners.keydown?.(tecla('a'));
    assert.equal(campo.desenfocado, undefined);
  });
}
