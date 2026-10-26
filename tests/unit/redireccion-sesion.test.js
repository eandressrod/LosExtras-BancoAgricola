import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import * as modelo from '../../public/pwa/inactividad-modelo.js';
import * as instantanea from '../../public/js/instantanea.js';

const source=(await readFile(new URL('../../public/js/comun.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replaceAll('export ','');
// Contrato de /api/auth/sesion cuando no hay sesión válida.
const sinSesion={ok:true,status:200,json:async()=>({perfil:null,sesion:null})};

test('una reapertura nueva no recupera una cookie que lleva veinte segundos fuera, aunque el backend aún la acepte', async () => {
  const datos=new Map([['los-extras-sesion-iniciada','1']]);
  const storage={getItem:k=>datos.get(k)??null,setItem:(k,v)=>datos.set(k,v),removeItem:k=>datos.delete(k),length:0};
  let calls=[];modelo.registrarSegundoPlano('sid',storage,Date.now()-21000);
  const resultado=await vm.runInNewContext(source+'\nfetchSession()',{
    ...modelo,localStorage:storage,sessionStorage:storage,Date,...instantanea,conMinimoCarga:async f=>f(),actualizarSesion(){throw new Error('No revelar una sesión vencida fuera de app');},
    fetch:async(url)=>{calls.push(url);return {ok:true,status:200,json:async()=>({perfil:{id:'A'},sesion:{id:'sid'}})};}
  });
  assert.equal(resultado,null);assert.deepEqual(calls,['/api/auth/sesion','/api/auth/logout']);
  assert.equal(datos.get('bancoagricola-motivo-salida'),'inactividad');
});

test('sesión ausente y 401 de datos vuelven al login conservando el motivo del aviso', async () => {
  for(const [ejecutar,respuesta] of [['requireSession()',sinSesion], ['getJSON("/api/menu").catch(()=>{})',{status:401}]]) {
    const datos=new Map([['los-extras-sesion-iniciada','1']]);
    const storage={getItem:k=>datos.get(k),setItem:(k,v)=>datos.set(k,v),removeItem:k=>datos.delete(k),length:0};
    let destino;
    const context={localStorage:storage,sessionStorage:storage,addEventListener(){},...instantanea,conMinimoCarga:async f=>f(),expirarSesion:()=>destino='/index.html',
      fetch:async()=>respuesta, location:{replace:url=>destino=url}};
    await vm.runInNewContext(source+'\n'+ejecutar,context);
    assert.equal(destino,'/index.html');
    assert.equal(datos.get('bancoagricola-motivo-salida'),'inactividad');
    assert.equal(datos.has('los-extras-sesion-iniciada'),false);
  }
});

test('SCRUM-109 la insignia de la sesión no muestra el tipo de tarjeta heredado del perfil', async () => {
  const storage={getItem:()=>null,setItem(){},removeItem(){},length:0};
  const insignia={hidden:true,textContent:''};
  await vm.runInNewContext(source+'\nrequireSession({revelar:false})',{
    localStorage:storage,sessionStorage:storage,addEventListener(){},...modelo,...instantanea,conMinimoCarga:async f=>f(),actualizarSesion(){},iniciarInactividad(){},
    document:{hidden:false,querySelector:selector=>selector==='#session-profile'?insignia:null},
    fetch:async()=>({ok:true,status:200,json:async()=>({perfil:{id:'A',nombre:'Usuario A',tipoTarjeta:'basica'},sesion:{id:'sid'}})})
  });
  assert.equal(insignia.textContent,'Usuario A');
  assert.equal(insignia.hidden,false);
});

test('una primera visita a una ruta privada pide login sin inventar una sesión anterior', async () => {
  const datos=new Map();
  const storage={getItem:k=>datos.get(k),setItem:(k,v)=>datos.set(k,v),removeItem:k=>datos.delete(k),length:0};
  let destino;
  await vm.runInNewContext(source+'\nrequireSession()',{
    localStorage:storage,sessionStorage:storage,addEventListener(){},...instantanea,conMinimoCarga:async f=>f(),
    fetch:async()=>sinSesion,location:{replace:url=>destino=url}
  });
  assert.equal(destino,'/index.html');
  assert.equal(datos.has('bancoagricola-motivo-salida'),false);
});
