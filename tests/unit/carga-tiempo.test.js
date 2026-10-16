import test from 'node:test';
import assert from 'node:assert/strict';

test('la carga rápida espera el mínimo y la lenta no agrega otra espera después', async () => {
  const { conMinimoCarga } = await import('../../public/js/carga-tiempo.js');
  let soltar; const espera=new Promise(r=>soltar=r); let recibida=false;
  const carga=conMinimoCarga(async()=>['dato'],{esperar:ms=>{assert.equal(ms,1000);return espera;}}).then(d=>{recibida=true;return d;});
  await Promise.resolve();await Promise.resolve();assert.equal(recibida,false);soltar();assert.deepEqual(await carga,['dato']);
  let resolver; const lenta=new Promise(r=>resolver=r);let esperas=0;
  const otra=conMinimoCarga(()=>lenta,{esperar:async()=>{esperas++;}});resolver('listo');assert.equal(await otra,'listo');assert.equal(esperas,1);
});

test('el error de carga también conserva el mínimo y se propaga', async () => {
  const { conMinimoCarga } = await import('../../public/js/carga-tiempo.js');
  let soltar;const espera=new Promise(r=>soltar=r);let terminada=false;
  const error=conMinimoCarga(()=>{throw new Error('Sin conexión');},{esperar:()=>espera}).catch(e=>{terminada=true;return e.message;});
  await Promise.resolve();assert.equal(terminada,false);soltar();assert.equal(await error,'Sin conexión');
});
