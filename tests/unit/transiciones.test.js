import test from 'node:test';
import assert from 'node:assert/strict';
import * as transiciones from '../../public/js/transiciones.js';

test('login desliza a la derecha antes de navegar y la entrada del menú se consume una sola vez', async () => {
  let resolver; const fin = new Promise(r => resolver=r); let destino=''; const almacen=new Map();
  const storage={getItem:k=>almacen.get(k),setItem:(k,v)=>almacen.set(k,v),removeItem:k=>almacen.delete(k)};
  let fotogramas;
  const pantalla={inert:false,animate(frames) {fotogramas=frames; return {finished:fin,cancel(){}};}};
  const salida=transiciones.deslizarHaciaMenu(pantalla,{storage,navegar:url=>destino=url});
  assert.equal(destino,''); assert.equal(pantalla.inert,true); assert.equal(fotogramas.at(-1).transform,'translateX(100%)');
  resolver(); await salida; assert.equal(destino,'/menu.html');
  await transiciones.animarEntradaMenu(pantalla,{storage,reducirMovimiento:true});
  assert.equal(almacen.size,0); assert.equal(pantalla.inert,false);
});

test('movimiento reducido navega sin deslizar ni bloquear la interfaz', async () => {
  let destino=''; const pantalla={animate(){throw new Error('No animar');}};
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
