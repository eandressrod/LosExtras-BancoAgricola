import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { conIndicador } from '../../public/js/transiciones.js';

const source=(await readFile(new URL('../../public/js/promociones.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'');
test('Promociones muestra el aro mientras consulta y lo retira al resolver o fallar, sin repetir apertura al reintentar', async () => {
  const elementos=new Map(); const get=s=>{if(!elementos.has(s))elementos.set(s,{hidden:false,textContent:'',className:'',replaceChildren(){},addEventListener(t,fn){this[t]=fn;}});return elementos.get(s);};
  let resolver, rechazar; let peticion=new Promise((r,j)=>{resolver=r;rechazar=j;}); let aperturas=0, consultas=0;
  const context={document:{querySelector:get,getElementById:()=>null},location:{search:'',hash:''},URLSearchParams,conIndicador,
    requireSession:async()=>({id:'A'}), registrarAperturaPromociones:async()=>{aperturas++;},getJSON:()=>{consultas++;return peticion;}};
  await vm.runInNewContext(`(async()=>{${source}\n})()`,context);
  for(let i=0;i<4;i++)await Promise.resolve();
  assert.equal(get('#promotions-loading').hidden,false); assert.equal(consultas,1);
  resolver([]); for(let i=0;i<8;i++)await Promise.resolve();
  assert.equal(get('#promotions-loading').hidden,true); assert.equal(get('#empty-preferences').hidden,false);
  peticion=new Promise((r,j)=>{resolver=r;rechazar=j;});
  const reintento=get('#retry').click(); assert.equal(get('#promotions-loading').hidden,false);
  rechazar(new Error('Sin conexión')); await reintento;
  assert.equal(get('#promotions-loading').hidden,true); assert.equal(get('#retry').hidden,false);
  assert.equal(get('#list-status').textContent,'Sin conexión'); assert.equal(aperturas,1); assert.equal(consultas,2);
});
