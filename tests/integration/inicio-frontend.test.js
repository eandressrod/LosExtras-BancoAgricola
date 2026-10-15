import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { necesitaCargaInicial, prepararInicio, transicionarInicio } from '../../public/js/inicio.js';
import { credencialesDePerfil } from '../../public/js/usuarios-prueba.js';

const source = (await readFile(new URL('../../public/js/login.js', import.meta.url), 'utf8')).replace(/^import[^\n]+\n/gm, '');
function element() {
  return { hidden:false, disabled:false, value:'', textContent:'', children:[], attributes:{}, open:false,
    setAttribute(k,v) { this.attributes[k]=v; }, removeAttribute(k) { delete this.attributes[k]; }, focus() {},
    showModal() { this.open=true; }, close() { this.open=false; }, appendChild(c) { this.children.push(c); }, replaceChildren(...c) { this.children=c; },
    addEventListener(type,fn) { this[type]=fn; } };
}
function page({ visitada = false, sesion = false, fallo = false, sesionPendiente = false } = {}) {
  const elementos = new Map();
  const get = selector => { if (!elementos.has(selector)) elementos.set(selector, element()); return elementos.get(selector); };
  const form = get('#login-form');
  form.elements = { username: element(), password: element() };
  form.querySelector = () => get('submit');
  const almacen = new Map(visitada ? [['los-extras-inicio-listo', '1']] : []);
  const storage = { getItem: k => almacen.get(k) ?? null, setItem: (k,v) => almacen.set(k,v) };
  let liberar; const tiempo = new Promise(resolve => { liberar = resolve; });
  let resolverSesion; const consultaSesion = new Promise(resolve => { resolverSesion = resolve; });
  const estado = { fallo, espera:0, consultas:0, destino:'', perfiles:[{id:'A',nombre:'A',usuarioAcceso:'a',clavePrueba:'ClaveA',promocionesAbiertas:false},{id:'midi-1',nombre:'Midi',usuarioAcceso:'midi',clavePrueba:'ClaveMidi',promocionesAbiertas:true}] };
  const context = {
    document: { querySelector:get, createElement:element, body: { dataset: {}, removeAttribute() {} } },
    sessionStorage: storage, addEventListener() {},
    location: { replace(url) { estado.destino = url; }, reload() {} },
    mayHaveSession: () => sesion, fetchSession: () => sesionPendiente ? consultaSesion : Promise.resolve(sesion ? { id:'A' } : null), forgetLogin() {}, rememberLogin() {},
    necesitaCargaInicial,
    transicionarInicio:(carga,acceso)=>transicionarInicio(carga,acceso,{reducirMovimiento:true}),
    deslizarHaciaMenu:async()=>{estado.slide=true;estado.destino='/menu.html';},
    fetch:async()=>({ok:true}),
    credencialesDePerfil,
    prepararInicio: opciones => prepararInicio({ ...opciones, esperar() { estado.espera++; return tiempo; } }),
    async getJSON(url) { assert.equal(url, '/api/perfiles?testing=1'); estado.consultas++; if (estado.fallo) throw new Error('No disponible'); return estado.perfiles; }
  };
  const lista = vm.runInNewContext(source, context);
  return { get, estado, liberar, lista, storage, resolverSesion };
}

test('recarga con pista de sesión no muestra carga/login ni pide perfiles antes de comprobar la sesión', async () => {
  const p = page({visitada:true,sesion:true,sesionPendiente:true});
  for (let i=0;i<12;i++) await Promise.resolve();
  assert.equal(p.get('#startup-screen').hidden,true);
  assert.equal(p.get('.login').hidden,true);
  assert.equal(p.estado.consultas,0);
  p.resolverSesion({id:'A'}); await p.lista;
  assert.equal(p.estado.destino,'/menu.html'); assert.equal(p.get('.login').hidden,true);
});

test('primera visita mantiene carga y oculta el login hasta completar perfiles y mínimo', async () => {
  const p = page();
  assert.equal(p.get('#startup-screen').hidden, false);
  assert.equal(p.get('.login').hidden, true);
  p.liberar(); await p.lista;
  assert.equal(p.get('#startup-screen').hidden, true);
  assert.equal(p.get('.login').hidden, false);
  assert.equal(p.get('submit').disabled, false);
  assert.equal(p.estado.consultas, 1);
});

test('fallo de consulta muestra Reintentar y recupera el login al resolver', async () => {
  const p = page({ fallo: true }); p.liberar(); await p.lista;
  assert.equal(p.get('#startup-screen').hidden, false);
  assert.equal(p.get('#startup-error').hidden, false);
  assert.equal(p.get('#startup-retry').disabled, false);
  assert.equal(p.get('.login').hidden, true);
  p.estado.fallo = false; await p.get('#startup-retry').click();
  assert.equal(p.get('.login').hidden, false);
  assert.equal(p.get('#startup-screen').hidden, true);
});

test('visita posterior conserva formulario y no repite la demora', async () => {
  const p = page({ visitada: true }); await p.lista;
  assert.equal(p.estado.espera, 0);
  assert.equal(p.get('.login').hidden, false);
  assert.equal(p.get('#startup-screen').hidden, true);
  assert.equal(p.estado.consultas, 0);
});

test('sesión vigente sigue entrando al menú después de la carga inicial', async () => {
  const p = page({ sesion: true }); p.liberar(); await p.lista;
  assert.equal(p.estado.destino, '/menu.html');
});

test('menú de usuarios rellena ambos campos, solo marca sin abrir y no inicia sesión por seleccionar', async () => {
  const p=page({visitada:true}); await p.lista;
  await p.get('#show-testing-users').click();
  const filas=p.get('#testing-users-list').children;
  assert.equal(filas.length,2); assert.equal(filas[0].children.length,3); assert.equal(filas[1].children.length,2);
  filas[1].click();
  assert.equal(p.get('#login-form').elements.username.value,'midi'); assert.equal(p.get('#login-form').elements.password.value,'ClaveMidi');
  assert.equal(p.get('#testing-users-dialog').open,false); assert.equal(p.estado.destino,'');
  p.estado.perfiles.push({id:'nuevo',nombre:'Nuevo',usuarioAcceso:'nuevo',clavePrueba:'123',promocionesAbiertas:false});
  await p.get('#show-testing-users').click(); assert.equal(p.get('#testing-users-list').children.length,3);
});

test('Contacto y Ayuda muestran información del equipo; recuperación abre usuarios', async () => {
  const p=page({visitada:true}); await p.lista;
  p.get('#login-contact').click(); assert.equal(p.get('#login-about').open,true);
  p.get('#close-login-about').click(); assert.equal(p.get('#login-about').open,false);
  p.get('#login-help').click(); assert.equal(p.get('#login-about').open,true);
  await p.get('#login-recover').click(); assert.equal(p.get('#testing-users-dialog').open,true);
});

test('credenciales aceptadas usan el deslizamiento antes de llegar al menú', async () => {
  const p=page({visitada:true}); await p.lista;
  const f=p.get('#login-form');f.elements.username.value='usuario';f.elements.password.value='clave';
  f.submit({preventDefault(){}});for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(p.estado.slide,true);assert.equal(p.estado.destino,'/menu.html');
});
