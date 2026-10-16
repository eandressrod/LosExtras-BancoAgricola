import test from 'node:test';
import assert from 'node:assert/strict';
import * as inicio from '../../public/js/inicio.js';
import { readFile } from 'node:fs/promises';

test('el HTML conserva bienvenida visible antes de descargar módulos, también con una visita o sesión previa', async () => {
  const html = await readFile(new URL('../../public/index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /dataset\.inicio\s*=\s*['"]directo/);
  assert.match(html, /id="startup-screen"[^>]*role="status"/);
  assert.match(html, /<main class="login" hidden>/);
});

test('transición conserva la carga hasta terminar el fundido y bloquea acceso durante la animación', async () => {
  const fin = pendiente();
  const animaciones = [];
  const carga = { hidden:false, animate(fotogramas, opciones) { animaciones.push({fotogramas,opciones}); return {finished:fin.promesa, cancel() {}}; } };
  const acceso = { hidden:true, inert:false, animate: carga.animate };
  const indicador = {hidden:true};
  const transicion = inicio.transicionarInicio(carga, acceso, {indicador,esperar:async()=>{}});
  assert.equal(carga.hidden, false); assert.equal(acceso.hidden, false); assert.equal(acceso.inert, true);
  assert.equal(animaciones.length, 2); assert.equal(animaciones[0].opciones.duration, 260);
  assert.equal(indicador.hidden,false);
  assert.ok(animaciones.every(a=>a.fotogramas.every(f=>f.transform===undefined)));
  fin.resolver(); await transicion;
  assert.equal(carga.hidden, true); assert.equal(acceso.inert, false);
});

test('movimiento reducido o animaciones no disponibles revela acceso sin demora', async () => {
  for (const reducirMovimiento of [true, false]) {
    const carga = { hidden:false }; const acceso = {hidden:true};
    await inicio.transicionarInicio(carga, acceso, {reducirMovimiento});
    assert.equal(carga.hidden,true); assert.equal(acceso.hidden,false); assert.equal(acceso.inert,false);
  }
});

test('cancelar la animación no deja la carga bloqueada ni el formulario inerte', async () => {
  const carga = {hidden:false,animate() {return {finished:Promise.reject(new Error('Cancelada')),cancel() {}};}};
  const acceso = {hidden:true,animate:carga.animate};
  await inicio.transicionarInicio(carga, acceso);
  assert.equal(carga.hidden,true); assert.equal(acceso.inert,false);
});

test('una carga cancelada por segundo plano no vuelve a revelar el formulario al terminar', async () => {
  const fin=pendiente();let vigente=true;
  const carga={hidden:false,animate(){return {finished:fin.promesa,cancel(){}};}};
  const acceso={hidden:true,animate:carga.animate};
  const transicion=inicio.transicionarInicio(carga,acceso,{vigente:()=>vigente});
  vigente=false;acceso.hidden=true;fin.resolver();await transicion;
  assert.equal(carga.hidden,false);assert.equal(acceso.hidden,true);
});

function almacenamiento(inicial = null) {
  let valor = inicial;
  return { getItem() { return valor; }, setItem(_, nuevo) { valor = nuevo; } };
}
function pendiente() {
  let resolver;
  const promesa = new Promise(resolve => { resolver = resolve; });
  return { promesa, resolver };
}

test('el aro se muestra en la cabecera del login con formulario oculto, después del splash', async () => {
  const fin=pendiente();
  const carga={hidden:false}; const acceso={hidden:true}; const indicador={hidden:true}; const formulario={hidden:false};
  const transicion=inicio.transicionarInicio(carga,acceso,{indicador,formulario,esperar:ms=>{assert.equal(ms,180);return fin.promesa;}});
  await Promise.resolve();
  assert.equal(carga.hidden,true); assert.equal(indicador.hidden,false); assert.equal(acceso.hidden,false); assert.equal(formulario.hidden,true);
  fin.resolver(); await transicion;
  assert.equal(indicador.hidden,true); assert.equal(acceso.hidden,false); assert.equal(formulario.hidden,false); assert.equal(acceso.inert,false);
});

test('el círculo espera los datos y se retira al formulario sin una animación adicional', async () => {
  const datos=pendiente();let animaciones=0;
  const animate=()=>{animaciones++;return {finished:Promise.resolve(),cancel(){}};};
  const carga={hidden:false,animate},acceso={hidden:true,animate},indicador={hidden:true},formulario={hidden:false};
  const transicion=inicio.transicionarInicio(carga,acceso,{indicador,formulario,preparar:()=>datos.promesa,esperar:async()=>{}});
  for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(formulario.hidden,true);assert.equal(indicador.hidden,false);
  datos.resolver(['listo']);assert.deepEqual(await transicion,['listo']);
  assert.equal(formulario.hidden,false);assert.equal(indicador.hidden,true);assert.equal(animaciones,2);
});

test('carga inicial espera 2000 ms aunque los perfiles lleguen antes y marca solo al terminar', async () => {
  const { prepararInicio } = await import('../../public/js/inicio.js');
  const storage = almacenamiento(); const tiempo = pendiente(); let terminado = false;
  const perfiles = [{ id: 'A', nombre: 'A' }, { id: 'midi-1', nombre: 'Creado en Midi' }];
  const resultado = prepararInicio({ storage, cargarPerfiles: async () => perfiles, esperar: ms => { assert.equal(ms, 2000); return tiempo.promesa; } }).then(r => { terminado = true; return r; });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(terminado, false); assert.equal(storage.getItem(), null);
  tiempo.resolver();
  assert.deepEqual((await resultado).perfiles, perfiles);
  assert.equal(storage.getItem(), '1');
});

test('cumplir los dos segundos no termina antes de recibir los perfiles', async () => {
  const { prepararInicio } = await import('../../public/js/inicio.js');
  const consulta = pendiente(); let terminado = false;
  const resultado = prepararInicio({ storage: almacenamiento(), cargarPerfiles: () => consulta.promesa, esperar: async () => {} }).then(r => { terminado = true; return r; });
  await Promise.resolve(); await Promise.resolve();
  assert.equal(terminado, false);
  consulta.resolver([{ id: 'B', nombre: 'B' }]);
  assert.equal((await resultado).error, null);
});

test('otra entrada en la misma pestaña no vuelve a pedir perfiles ni repetir el mínimo', async () => {
  const { prepararInicio, necesitaCargaInicial } = await import('../../public/js/inicio.js');
  const storage = almacenamiento('1'); assert.equal(necesitaCargaInicial(storage), false);
  let consultas = 0;
  const resultado = await prepararInicio({ storage, cargarPerfiles: async () => { consultas++; return []; }, esperar() { throw new Error('No debe repetir la espera'); } });
  assert.equal(consultas, 0); assert.deepEqual(resultado.perfiles, []);
});

test('un fallo de perfiles no marca la pestaña y permite reintentar', async () => {
  const { prepararInicio } = await import('../../public/js/inicio.js');
  const storage = almacenamiento();
  const fallo = await prepararInicio({ storage, cargarPerfiles: async () => { throw new Error('Sin conexión'); }, esperar: async () => {} });
  assert.equal(fallo.error.message, 'Sin conexión'); assert.equal(storage.getItem(), null);
  const bien = await prepararInicio({ storage, cargarPerfiles: async () => [], esperar: async () => {} });
  assert.equal(bien.error, null); assert.equal(storage.getItem(), '1');
});

test('almacenamiento bloqueado no impide cargar los perfiles', async () => {
  const { prepararInicio, necesitaCargaInicial } = await import('../../public/js/inicio.js');
  const storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
  assert.equal(necesitaCargaInicial(storage), true);
  const resultado = await prepararInicio({ storage, cargarPerfiles: async () => [{ id: 'A' }], esperar: async () => {} });
  assert.equal(resultado.error, null); assert.equal(resultado.perfiles.length, 1);
});
