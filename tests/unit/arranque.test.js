import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

test('reiniciar al inicio omite la entrada desde la derecha de la bienvenida', async () => {
  const source=await readFile(new URL('../../public/js/arranque.js',import.meta.url),'utf8');
  const eventos={},root={dataset:{},removeAttribute(){}};let omitidas=0;
  vm.runInNewContext(source,{addEventListener(t,f){eventos[t]=f;},location:{pathname:'/index.html'},document:{documentElement:root}});
  eventos.pagereveal({viewTransition:{ready:Promise.resolve(),finished:Promise.resolve(),updateCallbackDone:Promise.resolve(),skipTransition(){omitidas++;}}});
  assert.equal(omitidas,1);assert.equal(root.dataset.transicionNativa,undefined);
});

test('volver al listado retira la pantalla actual; omitir encuesta continúa hacia delante', async () => {
  const source=await readFile(new URL('../../public/js/arranque.js',import.meta.url),'utf8');
  for (const [actual,destino,direccion] of [['/detalle.html','/promociones.html','volver'],['/encuesta.html','/promociones.html','entrar'],['/promociones.html','/menu.html','volver']]) {
    let click;const root={dataset:{},setAttribute(){}};
    vm.runInNewContext(source,{URL,addEventListener(){},document:{referrer:'https://app.test/menu.html',documentElement:root,addEventListener(t,f){if(t==='click')click=f;}},location:{pathname:actual,origin:'https://app.test',href:'https://app.test'+actual},performance:{getEntriesByType:()=>[{type:'navigate'}]}});
    click({target:{closest:()=>({href:'https://app.test'+destino})}});assert.equal(root.dataset.direccion,direccion);
  }
});

test('cancelar una transición nativa esperada no oculta errores ajenos de la aplicación', async () => {
  const source=await readFile(new URL('../../public/js/arranque.js',import.meta.url),'utf8');
  const eventos={};vm.runInNewContext(source,{addEventListener(t,f){eventos[t]=f;},location:{pathname:'/index.html'},document:{}});
  let cancelado=false;
  eventos.unhandledrejection?.({reason:{name:'InvalidStateError',message:'Transition was aborted because of invalid state. ViewTransition opt-in disabled'},preventDefault(){cancelado=true;}});
  assert.equal(cancelado,true);cancelado=false;
  eventos.unhandledrejection?.({reason:new Error('Error de sesión'),preventDefault(){cancelado=true;}});
  assert.equal(cancelado,false);
});

test('la carga bancaria cubre recargas, reaperturas y restauraciones sin repetirla entre páginas internas', async () => {
  const source = await readFile(new URL('../../public/js/arranque.js', import.meta.url), 'utf8');
  for (const [type, referrer, esperado] of [
    ['reload', 'https://app.test/menu.html', 'pending'],
    ['navigate', '', 'pending'],
    ['back_forward', 'https://app.test/detalle.html', 'pending'],
    ['navigate', 'https://app.test/menu.html', undefined],
    ['navigate', 'https://otra.test/', 'pending']
  ]) {
    const root = { dataset: {}, setAttribute() {} };
    vm.runInNewContext(source, {
      URL, document: { referrer, documentElement: root },
      location: { pathname: '/promociones.html', origin: 'https://app.test' },
      performance: { getEntriesByType: () => [{ type }] }
    });
    assert.equal(root.dataset.arranque, esperado, type + ' ' + referrer);
  }
});
