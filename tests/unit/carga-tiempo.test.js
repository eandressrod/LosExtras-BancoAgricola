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

test('las pantallas privadas no esperan un mínimo para verificar la sesión', async () => {
  const { fetchSession } = await import('../../public/js/comun.js');
  const anterior = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ perfil: null }) });
  try {
    const inicio = Date.now();
    assert.equal(await fetchSession(), null);
    assert.ok(Date.now() - inicio < 200, `tardó ${Date.now() - inicio} ms`);
  } finally { globalThis.fetch = anterior; }
});

test('al volver con Atrás la página restaurada se conserva si la sesión sigue siendo del mismo perfil', async () => {
  const { recargarAlVolver } = await import('../../public/js/comun.js');
  assert.equal(recargarAlVolver({ id: 'A' }, { id: 'A' }), false, 'mismo perfil: se muestra al instante');
  assert.equal(recargarAlVolver({ id: 'A' }, { id: 'B' }), true, 'otro perfil inició sesión');
  assert.equal(recargarAlVolver({ id: 'A' }, null), true, 'la sesión terminó');
  assert.equal(recargarAlVolver(null, { id: 'A' }), true, 'la página no tenía perfil');
});
