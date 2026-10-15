import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { partesSaldo } from '../../public/js/menu-modelo.js';

const source = (await readFile(new URL('../../public/js/menu.js', import.meta.url), 'utf8')).replace(/^\uFEFF?import[^\n]+\n/gm, '');
function element() {
  return {
    hidden: false, disabled: false, style: {}, attributes: {}, children: [], textContent: '', innerHTML: '', open: false,
    showModal() { this.open = true; }, close() { this.open = false; }, focus() {},
    addEventListener(type, fn) { this[type] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; },
    appendChild(child) { this.children.push(child); return child; },
    replaceChildren(...children) { this.children = children; },
    querySelector() { return this.child ??= element(); },
    classList: { add() {} }
  };
}
async function page({ statuses = [200], completed = false, logoutFails = false } = {}) {
  const els = new Map(); let ready; let forgotten = false; const requests = [];
  const get = id => { if (!els.has(id)) els.set(id, { ...element(), id }); return els.get(id); };
  const location = { value: '', assign(url) { this.value = url; }, replace(url) { this.value = url; }, reload() {} };
  const state = { completed, logoutFails };
  const context = {
    document: { getElementById: get, querySelector: () => get('btn-ver-todas'), querySelectorAll: () => [], createElement: element, addEventListener(_, fn) { ready = fn; } },
    window: { location }, location,
    requireSession: async () => ({ id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' }),
    cardName: () => 'Tarjeta Básica', compartirCuenta: async () => 'copiado', partesSaldo,
    animarEntradaMenu:async()=>{ requests.push('entrada-menu'); },
    forgetLogin() { forgotten = true; },
    logout: async () => { if (state.logoutFails) throw new Error('No se pudo cerrar la sesión.'); forgotten = true; },
    fetch: async url => {
      requests.push(url); const status = statuses.length > 1 ? statuses.shift() : statuses[0];
      return { ok: status === 200, status, json: async () => status === 200 ? {
        perfil: { id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' },
        cuentas: [{ id: 'cta-a', nombre: 'Cuenta A', tipo: 'Ahorro', numeroEnmascarado: '•••• 1234', numeroCompleto: '1000001234', saldo: 30, moneda: 'USD' }],
        tarjetas: [{ id: 'tarjeta-a', numeroEnmascarado: '•••• 9876', saldo: 50, moneda: 'USD', producto: { nombre: 'Clásica', modalidad: 'crédito', red: 'Visa' } }],
        encuestaPendiente: !state.completed, destinoPromociones: state.completed ? '/promociones.html' : '/encuesta.html'
      } : { error: 'Servicio no disponible' } };
    }
  };
  context.getJSON = async url => { const res = await context.fetch(url); if (!res.ok) throw new Error('No se pudieron cargar los datos.'); return res.json(); };
  vm.runInNewContext(source, context);
  await ready();
  return { get, state, location, requests, forgotten: () => forgotten };
}

test('entrar carga el menú y no abre encuesta antes del clic', async () => {
  const p = await page();
  assert.equal(p.location.value, '');
  assert.equal(p.get('menu-content').hidden, false);
  assert.equal(p.get('productos-lista').children.length, 1);
  const cuenta = p.get('productos-lista').children[0];
  assert.equal(cuenta.children[1].textContent, '1000001234 Ahorro');
  assert.equal(cuenta.children[5].children[0].textContent, 'N.º 1000001234');
  await p.get('btn-mis-tarjetas').click();
  const tarjeta = p.get('productos-lista').children[0];
  assert.equal(tarjeta.children[0].children[0].children[0].textContent, '•••• 9876 Clásica');
  assert.equal(tarjeta.children[0].children[1].children[1].textContent, '•••• 9876');
});

test('Promociones para ti entra en el módulo y delega encuesta y elegibilidad', async () => {
  const pendiente = await page();
  await pendiente.get('btn-promociones').click();
  assert.equal(pendiente.location.value, '/promociones.html?entrada=menu');
  const completada = await page();
  completada.state.completed = true;
  await completada.get('btn-promociones').click();
  assert.equal(completada.location.value, '/promociones.html?entrada=menu');
  assert.deepEqual(completada.requests, ['entrada-menu', '/api/menu']);
});

test('fallo al cargar no navega ni conserva cuentas visibles; Reintentar recupera', async () => {
  const p = await page({ statuses: [503, 200] });
  assert.equal(p.location.value, '');
  assert.equal(p.get('menu-content').hidden, true);
  assert.equal(p.get('menu-error').hidden, false);
  await p.get('btn-reintentar').click();
  assert.equal(p.get('menu-content').hidden, false);
});

test('logout exitoso vuelve al login; fallo conserva sesión y muestra error', async () => {
  const bien = await page();
  await bien.get('btn-logout').click();
  assert.equal(bien.location.value, '/index.html');
  const mal = await page({ logoutFails: true });
  await mal.get('btn-logout').click();
  assert.equal(mal.location.value, '');
  assert.equal(mal.forgotten(), false);
  assert.equal(mal.get('alerta-logout').hidden, false);
});
