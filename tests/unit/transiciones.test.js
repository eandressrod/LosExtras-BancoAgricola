import test from 'node:test';
import assert from 'node:assert/strict';
import * as transiciones from '../../public/js/transiciones.js';

test('el login permanece debajo de la pantalla entrante, sin un segundo slide de salida', async () => {
  const pantalla = { hidden:false, inert:false, animate() { throw new Error('No repetir slide en login'); } };
  let destino;
  await transiciones.deslizarHaciaMenu(pantalla, { storage:{setItem(){}}, navegar(url) {
    assert.equal(pantalla.hidden,false);
    destino=url;
  } });
  assert.equal(destino,'/menu.html');
});

test('la entrada del menú se anima y consume una sola vez después de abandonar el login', async () => {
  let resolver; const fin = new Promise(r => resolver=r); let destino=''; const almacen=new Map();
  const storage={getItem:k=>almacen.get(k),setItem:(k,v)=>almacen.set(k,v),removeItem:k=>almacen.delete(k)};
  let fotogramas;
  const pantalla={inert:false,animate(frames) {fotogramas=frames; return {finished:fin,cancel(){}};}};
  await transiciones.deslizarHaciaMenu(pantalla,{storage,navegar:url=>destino=url});
  assert.equal(destino,'/menu.html'); assert.equal(fotogramas,undefined);
  const entrada = transiciones.animarEntradaMenu(pantalla,{storage});
  assert.equal(pantalla.inert,true); assert.equal(fotogramas[0].transform,'translateX(100%)'); assert.equal(fotogramas.at(-1).transform,'translateX(0)');
  resolver(); await entrada;
  assert.equal(almacen.size,0); assert.equal(pantalla.inert,false);
});

test('movimiento reducido navega sin deslizar ni bloquear la interfaz', async () => {
  let destino=''; const pantalla={inert:false,animate(){throw new Error('No animar');}};
  await transiciones.deslizarHaciaMenu(pantalla,{reducirMovimiento:true,storage:{setItem(){}},navegar:url=>destino=url});
  assert.equal(destino,'/menu.html'); assert.equal(pantalla.inert,false);
});

test('una animación cancelada o almacenamiento bloqueado no impiden llegar al menú', async () => {
  let destino='';
  await transiciones.deslizarHaciaMenu({animate(){return {finished:Promise.reject(new Error()),cancel(){}};}},{storage:{setItem(){throw new Error();}},navegar:url=>destino=url});
  assert.equal(destino,'/menu.html');
});

test('el indicador de módulo se mantiene durante la petición y se retira tanto al resolver como al fallar', async () => {
  let resolver; const fin=new Promise(r=>resolver=r); const indicador={hidden:true}; let consultas=0;
  const consulta=transiciones.conIndicador(indicador,()=>{consultas++;return fin;});
  assert.equal(indicador.hidden,false); assert.equal(consultas,1); resolver(['oferta']);
  assert.deepEqual(await consulta,['oferta']); assert.equal(indicador.hidden,true);
  await assert.rejects(transiciones.conIndicador(indicador,()=>{throw new Error('Sin conexión');}));
  assert.equal(indicador.hidden,true);
});

test('el menú se revela cuando ya se aplicó el primer fotograma de entrada', async () => {
  const valores=new Map([['los-extras-entrada-menu','1']]);let animando=false,revelado=false,resolver;
  const finished=new Promise(r=>resolver=r);
  const pantalla={animate(){animando=true;return {finished,cancel(){}};}};
  const entrada=transiciones.animarEntradaMenu(pantalla,{storage:{getItem:k=>valores.get(k),removeItem:k=>valores.delete(k)},revelar(){assert.equal(animando,true);revelado=true;}});
  assert.equal(revelado,true);resolver();await entrada;
});

test('al volver se mantiene la dirección de retirada hasta terminar la transición', async () => {
  let resolver;let ejecutada=false;
  const documento={documentElement:{dataset:{}},startViewTransition(accion){accion();return {ready:Promise.resolve(),finished:new Promise(r=>resolver=r)};}};
  const regreso=transiciones.regresarEnVentana(()=>{ejecutada=true;},{documento,reducirMovimiento:false});
  assert.equal(ejecutada,true);assert.equal(documento.documentElement.dataset.direccion,'volver');
  resolver();await regreso;assert.equal(documento.documentElement.dataset.direccion,undefined);
});

test('el aviso conserva cuatro segundos y se desvanece antes de retirarse', async () => {
  let soltar;let fin;const aviso={hidden:false,animate(frames,opciones){assert.equal(opciones.duration,1000);assert.equal(frames[1].opacity,0);return {finished:new Promise(r=>fin=r),cancel(){}};}};
  const retiro=transiciones.programarRetiroAviso(aviso,{esperar:ms=>{assert.equal(ms,4000);return new Promise(r=>soltar=r);},reducirMovimiento:false});
  assert.equal(aviso.hidden,false);soltar();await Promise.resolve();assert.equal(aviso.hidden,false);fin();await retiro;assert.equal(aviso.hidden,true);
});

test('la entrada desde login retira solo la carga hacia la derecha, una sola vez', async () => {
  const almacen = new Map([['los-extras-entrada-menu','carga']]);
  const storage = {getItem:k=>almacen.get(k),removeItem:k=>almacen.delete(k)};
  const pantalla = {animate(){throw new Error('El menú debe permanecer inmóvil');}};
  let veces = 0;
  const cubierta = {hidden:false,animate(frames){veces++;assert.equal(frames[0].transform,'translateX(0)');assert.equal(frames[1].transform,'translateX(100%)');return {finished:Promise.resolve(),cancel(){}};}};
  await transiciones.animarEntradaMenu(pantalla,{storage,cubierta,revelar(){},reducirMovimiento:false});
  await transiciones.animarEntradaMenu(pantalla,{storage,cubierta,revelar(){},reducirMovimiento:false});
  assert.equal(veces,1);assert.equal(cubierta.hidden,true);
});

test('la sesión recuperada desvanece la carga y no desliza el menú', async () => {
  const almacen = new Map([['los-extras-entrada-menu','fade']]);let frames;
  const cubierta = {hidden:false,animate(f){frames=f;return {finished:Promise.resolve(),cancel(){}};}};
  await transiciones.animarEntradaMenu({},{storage:{getItem:k=>almacen.get(k),removeItem:k=>almacen.delete(k)},cubierta,revelar(){},reducirMovimiento:false});
  assert.deepEqual(frames,[{opacity:1},{opacity:0}]);assert.equal(cubierta.hidden,true);
});

test('el formulario hace fade al círculo de su misma pantalla, sin recuperar la bienvenida bancaria', async () => {
  let resolver;let animada=false;
  const carga={hidden:true,animate(){throw new Error('No animar otra pantalla de carga');}};
  const login={hidden:false,animate(frames){animada=true;assert.deepEqual(frames,[{opacity:1},{opacity:0}]);return {finished:new Promise(r=>resolver=r),cancel(){}};}};
  const transicion=transiciones.mostrarCargaAcceso(login,carga,{reducirMovimiento:false});
  assert.equal(animada,true);assert.equal(carga.hidden,false);assert.equal(login.inert,true);
  resolver();await transicion;assert.equal(login.hidden,true);
});

test('un retorno que pierde vigencia durante el fade conserva la cubierta visible', async () => {
  let resolver;let vigente=true;
  const cubierta={hidden:false,animate(){return {finished:new Promise(r=>resolver=r),cancel(){}};}};
  const retiro=transiciones.retirarCarga(cubierta,{reducirMovimiento:false,vigente:()=>vigente});
  vigente=false;resolver();await retiro;assert.equal(cubierta.hidden,false);
});

test('las dos salidas de carga respetan movimiento reducido sin dejar el menú cubierto', async () => {
  for (const modo of ['carga','fade']) {
    const valores=new Map([['los-extras-entrada-menu',modo]]);
    const cubierta={hidden:false,animate(){throw new Error('No animar con movimiento reducido');}};
    await transiciones.animarEntradaMenu({}, {cubierta,reducirMovimiento:true,revelar(){},storage:{getItem:k=>valores.get(k),removeItem:k=>valores.delete(k)}});
    assert.equal(cubierta.hidden,true);assert.equal(valores.size,0);
  }
});
