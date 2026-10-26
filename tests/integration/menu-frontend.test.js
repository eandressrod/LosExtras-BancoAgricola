import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as modeloMenu from '../../public/js/menu-modelo.js';
import { descripcionTarjetas } from '../../public/js/tarjeta-elegida.js';

const source = (await readFile(new URL('../../public/js/menu.js', import.meta.url), 'utf8')).replace(/^\uFEFF?import[^\n]+\n/gm, '');
function element() {
  return {
    hidden: false, disabled: false, style: {}, dataset: {}, attributes: {}, children: [], textContent: '', innerHTML: '', open: false,
    showModal() { this.open = true; }, close() { this.open = false; this.onclose?.(); }, focus() {},
    addEventListener(type, fn) { this[type === 'close' ? 'onclose' : type] = fn; },
    setAttribute(name, value) { this.attributes[name] = value; },
    getAttribute(name) { return this.attributes[name]; },
    get firstChild() { return this.children[0]; },
    appendChild(child) { if(child.parent){child.parent.children.splice(child.parent.children.indexOf(child),1);}this.children.push(child);child.parent=this;return child; },
    replaceChildren(...children) { this.children = children; },
    querySelector() { return this.child ??= element(); },
    classList: { add() {} }
  };
}
async function page({ statuses = [200], completed = false, logoutFails = false, cuentas, tarjetas, elegida = null, mensajes = [], entrada } = {}) {
  const els = new Map(); let ready; let forgotten = false; const requests = [];
  const get = id => { if (!els.has(id)) els.set(id, { ...element(), id }); return els.get(id); };
  const location = { value: '', assign(url) { this.value = url; }, replace(url) { this.value = url; }, reload() {} };
  const state = { completed, logoutFails };
  const context = {
    document: { documentElement:{dataset:{entradaMenu:entrada},removeAttribute() { delete this.dataset.entradaMenu; }}, body:{dataset:{}}, getElementById: get, querySelector: () => get('btn-ver-todas'), querySelectorAll: () => [], createElement: element, addEventListener(_, fn) { ready = fn; } },
    window: { location }, location,
    requireSession: async () => ({ id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' }),
    ...modeloMenu,
    cardName: () => 'Tarjeta Básica', descripcionTarjetas, almacenSesion: () => null, leerTarjetaElegida: () => elegida, compartirCuenta: async () => 'copiado',
    animarEntradaMenu:async(_,opciones)=>{ requests.push('entrada-menu'); opciones?.revelar(); }, animarPantalla:async()=>{}, regresarEnVentana:async f=>f(), conMinimoCarga:async f=>f(), revelarPagina(){},
    forgetLogin() { forgotten = true; },
    logout: async () => { if (state.logoutFails) throw new Error('No se pudo cerrar la sesión.'); forgotten = true; },
    fetch: async url => {
      if (url === '/api/mensajes') return { ok:true, status:200, json:async()=>mensajes };
      requests.push(url); const status = statuses.length > 1 ? statuses.shift() : statuses[0];
      return { ok: status === 200, status, json: async () => status === 200 ? {
        perfil: { id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica' },
        cuentas: cuentas ?? [{ id: 'cta-a', nombre: 'Cuenta A', tipo: 'Ahorro', numeroEnmascarado: '•••• 1234', numeroCompleto: '1000001234', saldo: 30, moneda: 'USD' }],
        tarjetas: tarjetas ?? [{ id: 'tarjeta-a', numeroEnmascarado: '•••• 9876', saldo: 50, moneda: 'USD', producto: { nombre: 'Clásica', modalidad: 'crédito', red: 'Visa' } }],
        encuestaPendiente: !state.completed, destinoPromociones: state.completed ? '/promociones.html' : '/encuesta.html'
      } : { error: 'Servicio no disponible' } };
    }
  };
  context.getJSON = async url => { const res = await context.fetch(url); if (!res.ok) throw new Error('No se pudieron cargar los datos.'); return res.json(); };
  vm.runInNewContext(source, context);
  await ready();
  return { get, state, location, requests, forgotten: () => forgotten };
}

test('Cuentas no muestra tarjetas recibidas de una API anterior, incluso si traen número completo', async () => {
  const p = await page({ cuentas: [
    { id: 'cta-a-3', nombre: 'Tarjeta Básica', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '•••• 4821', numeroCompleto: null, saldo: 0, moneda: 'USD' },
    { id: 'cta-b-2', nombre: 'Tarjeta Black', tipo: 'Tarjeta de Crédito', numeroEnmascarado: '•••• 1744', numeroCompleto: '3896681744', saldo: 1200, moneda: 'USD' }
  ] });
  const filas = p.get('productos-lista').children;
  assert.equal(filas.length,1);
  assert.equal(filas[0].textContent,'No tienes cuentas registradas.');
  await p.get('btn-mis-tarjetas').click();
  assert.equal(p.get('productos-lista').children[0].children[0].children[1].children[1].textContent,'•••• 9876');
});

test('Perfil abre la pantalla bancaria con identidad y solo cierre de sesión', async () => {
  const p = await page();
  await p.get('btn-perfil').click();
  assert.equal(p.get('menu-dialog').dataset.vista, 'perfil');
  assert.equal(p.get('btn-logout').hidden, false);
  assert.equal(p.get('dialog-body').children[1].textContent, 'Usuario A');
  assert.equal(p.get('dialog-back').attributes['aria-label'], 'Volver al menú');
  assert.equal(p.get('menu-dialog').scrollTop, 0);
});

test('SCRUM-109 Perfil nombra la tarjeta elegida y no el tipo heredado del perfil', async () => {
  const propias = [
    { id: 'cta-a-3', tipoTarjeta: 'basica', numeroEnmascarado: '•••• 4821', saldo: 0, moneda: 'USD', producto: { nombre: 'Clásica', modalidad: 'crédito', red: 'Visa' } },
    { id: 'cta-a-4', tipoTarjeta: 'black', numeroEnmascarado: '•••• 7754', saldo: 0, moneda: 'USD', producto: { nombre: 'Black', modalidad: 'crédito', red: 'Visa' } }
  ];
  const elegida = await page({ tarjetas: propias, elegida: 'cta-a-4' });
  await elegida.get('btn-perfil').click();
  assert.equal(elegida.get('dialog-body').children[2].textContent, 'Tarjeta Black');
  const sinElegir = await page({ tarjetas: propias });
  await sinElegir.get('btn-perfil').click();
  assert.equal(sinElegir.get('dialog-body').children[2].textContent, '2 tarjetas');
  const sinTarjetas = await page({ tarjetas: [] });
  await sinTarjetas.get('btn-perfil').click();
  assert.equal(sinTarjetas.get('dialog-body').children.length, 2);
});

test('disponibles se despliega en el menú; Metas solo presenta la referencia sin consultar API', async () => {
  const p=await page();
  p.get('panel-disponibles').hidden=true;
  await p.get('btn-disponibles').click();
  assert.equal(p.get('panel-disponibles').hidden,false);
  assert.equal(p.get('btn-disponibles').attributes['aria-expanded'],'true');
  assert.equal(p.get('menu-dialog').open,false);
  await p.get('btn-disponibles').click();
  assert.equal(p.get('panel-disponibles').hidden,true);
  await p.get('tab-metas').click();
  assert.equal(p.requests.includes('/api/metas'),false);
  assert.equal(p.get('productos-lista').children[0].children[0].textContent,'¡Cumple todas tus metas!');
});

test('las fichas no añaden USD ni cuenta asociada en la presentación', async () => {
  const p=await page();
  const textos=n=>[n.textContent,...n.children.flatMap(textos)];
  assert.equal(textos(p.get('productos-lista')).some(t=>t.includes('USD')),false);
  await p.get('btn-mis-tarjetas').click();
  assert.equal(textos(p.get('productos-lista')).some(t=>/USD|Cuenta asociada/.test(t)),false);
});

test('solo una cuenta despliega opciones deshabilitadas y Compartir conserva su acción', async () => {
  const p=await page();const cuenta=p.get('productos-lista').children[0];const resumen=cuenta.children[0];
  const toggle=resumen.children.find(n=>n.className==='account-toggle');
  assert.ok(toggle);await toggle.click();assert.equal(toggle.attributes['aria-expanded'],'true');
  const cortina=cuenta.children.find(n=>n.className==='account-curtain');
  assert.equal(cortina.attributes['aria-hidden'],'false');assert.ok(cortina.children[0].children.every(n=>n.disabled));
  await toggle.click();assert.equal(toggle.attributes['aria-expanded'],'false');
  await resumen.children[5].children[1].click();assert.equal(p.get('dialog-title').textContent,'Compartir número');
  await p.get('btn-mis-tarjetas').click();assert.equal(p.get('productos-lista').children[0].children.some(n=>n.className==='account-toggle'),false);
});

test('Entrada abre mensajes con fecha y estado accesible; vacío no ofrece enviar', async () => {
  const p = await page({ mensajes:[{ id:'m1', titulo:'Tus productos', fecha:'2026-10-14T15:00:00.000Z', leido:false }] });
  await p.get('btn-mensajeria').click();
  assert.equal(p.get('menu-dialog').dataset.vista, 'entrada');
  assert.equal(p.get('dialog-body').children[0].className, 'inbox-list');
  const fila = p.get('dialog-body').children[0].children[0];
  assert.equal(fila.children[1].textContent, '14/10/2026');
  assert.match(fila.attributes['aria-label'], /Sin leer/);
  const vacia = await page();
  await vacia.get('btn-mensajeria').click();
  assert.equal(vacia.get('dialog-body').children[0].textContent, 'No hay mensajes');
});

test('volver desde Mensajería carga Cuentas con datos existentes, sin volver a consultar el menú', async () => {
  const p=await page();await p.get('btn-mis-tarjetas').click();await p.get('btn-mensajeria').click();
  const anterior=p.get('menu-loading');
  // La espera se comprueba también con reloj real en navegador; aquí interesa la ruta y sus peticiones.
  await p.get('dialog-back').click();
  assert.equal(p.get('menu-dialog').open,false);
  assert.equal(p.get('tab-cuentas').attributes['aria-selected'],'true');
  assert.equal(p.get('menu-content').hidden,false);assert.equal(anterior.hidden,true);
  assert.equal(p.requests.filter(x=>x==='/api/menu').length,1);
});

test('entrar carga el menú y no abre encuesta antes del clic', async () => {
  const p = await page();
  assert.equal(p.location.value, '');
  assert.equal(p.get('menu-content').hidden, false);
  assert.equal(p.get('productos-lista').children.length, 1);
  const cuenta = p.get('productos-lista').children[0].children[0];
  assert.equal(cuenta.children[1].textContent, '1000001234 Ahorro');
  assert.equal(cuenta.children[5].children[0].textContent, 'N.º 1000001234');
  await p.get('btn-mis-tarjetas').click();
  const tarjeta = p.get('productos-lista').children[0];
  assert.equal(tarjeta.children[0].children[0].children[0].textContent, '•••• 9876 Clásica');
  assert.equal(tarjeta.children[0].children[1].children[1].textContent, '•••• 9876');
});

test('el acceso desde login desliza el menú antes de esperar sus productos', async () => {
  const p = await page({ entrada:'login' });
  assert.equal(p.requests[0], 'entrada-menu');
  assert.equal(p.requests[1], '/api/menu');
  assert.equal(p.get('menu-content').hidden, false);
});

test('Promociones para ti entra en el módulo y delega encuesta y elegibilidad', async () => {
  const pendiente = await page();
  await pendiente.get('btn-promociones').click();
  assert.equal(pendiente.location.value, '/promociones.html?entrada=menu');
  const completada = await page();
  completada.state.completed = true;
  await completada.get('btn-promociones').click();
  assert.equal(completada.location.value, '/promociones.html?entrada=menu');
  assert.deepEqual(completada.requests, ['/api/menu', 'entrada-menu']);
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
