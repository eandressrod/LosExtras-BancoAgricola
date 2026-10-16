import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { estadoInactividad, plazoLocal, avisoDiscreto } from '../../public/pwa/inactividad-modelo.js';
import * as modelo from '../../public/pwa/inactividad-modelo.js';
const source = (await readFile(new URL('../../public/pwa/inactividad.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replaceAll('export function','function');
function pagina({ pathname='/menu.html', lecturaMensaje=false, fallaActividad=false, sesionVencida=false, conDialogo=false } = {}) {
  let tiempo = 0; let intervalo; let destino = ''; const llamadas = []; const opciones = []; const tareas = new Map(); let id = 0;
  const eventos = {}; const nodos = []; const atributos = new Set();
  const crear = tag => {
    const e = { tag, hidden:false, open:false, disabled:false, children:[], eventos:{}, textContent:'',
      append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children=children; },
      setAttribute() {}, addEventListener(t,f) { this.eventos[t]=f; }, showModal() { this.open=true; }, close() { this.open=false; } };
    nodos.push(e); return e;
  };
  const dialogoLectura={append(n){n.parentNode=this;}};
  const document = { hidden:false, querySelector:()=>conDialogo?dialogoLectura:null, createElement:crear, body:{dataset:{lecturaMensaje:String(lecturaMensaje)},append(n){n.parentNode=this;}}, documentElement:{setAttribute(k){atributos.add(k);},removeAttribute(k){atributos.delete(k);}},addEventListener(t,f){eventos[t]=f;} };
  const valores=new Map();const storage = {getItem:k=>valores.get(k)??null,setItem:(k,v)=>valores.set(k,v),removeItem:k=>valores.delete(k)};
  const estado = {id:'sesion',ahora:0,inactivaEn:120000,expiraEn:7200000};
  const context = {...modelo,document,localStorage:storage,sessionStorage:storage,Date:{now:()=>tiempo},Math,Number,JSON,
    location:{pathname,replace(url){destino=url;},reload(){destino='reload';}},addEventListener(t,f){eventos[t]=f;}, avisoDiscreto,conMinimoCarga:async f=>f(),
    retirarCarga:async cubierta=>{llamadas.push('fade-carga');cubierta.hidden=true;},
    setInterval(fn){intervalo=fn;},clearTimeout(key){tareas.delete(key);},setTimeout(fn){tareas.set(++id,fn);return id;},estadoInactividad:(plazo)=>estadoInactividad(plazo,tiempo),plazoLocal:s=>plazoLocal(s,tiempo),
    async fetch(url,options){llamadas.push(url);opciones.push(options);
      // Sin sesión válida, /api/auth/sesion responde 200 sin perfil; las demás API privadas, 401.
      if(sesionVencida&&url==='/api/auth/sesion')return {ok:true,status:200,json:async()=>({perfil:null,sesion:null})};
      return {ok:!fallaActividad,status:sesionVencida?401:200,json:async()=>({perfil:{id:'A'},sesion:{...estado,ahora:tiempo,inactivaEn:tiempo+120000}})};}
  };
  vm.runInNewContext(source+'\nactualizarSesion('+JSON.stringify(estado)+'); iniciarInactividad();',context);
  return {document,dialogoLectura,eventos,nodos,atributos,llamadas,opciones,get destino(){return destino;},reloj(ms){tiempo=ms;},avanzar(ms){tiempo=ms;intervalo();},finalizarSalida(){for(const fn of tareas.values())fn();tareas.clear();},async enviarActividad(){await eventos.pointerdown({isTrusted:true});for(const [key,fn] of tareas){tareas.delete(key);await fn();}},async ejecutar(t){await eventos[t]();},dialogo:()=>nodos.find(n=>n.className==='pwa-sesion')};
}

test('volver al detalle antes de veinte segundos hace fade a la misma vista', async () => {
  const p=pagina({pathname:'/detalle.html'});p.document.hidden=true;await p.ejecutar('visibilitychange');p.reloj(19999);
  p.document.hidden=false;await p.ejecutar('visibilitychange');for(let i=0;i<12;i++)await Promise.resolve();
  assert.equal(p.destino,'');assert.deepEqual(p.llamadas,['/api/auth/sesion','fade-carga']);
});

test('tras veinte segundos fuera revoca la sesión antes de revelar datos, aunque se pausaran los timers', async () => {
  const p=pagina();p.document.hidden=true;await p.ejecutar('visibilitychange');p.reloj(20000);
  p.document.hidden=false;await p.ejecutar('visibilitychange');for(let i=0;i<12;i++)await Promise.resolve();p.finalizarSalida();
  assert.equal(p.destino,'/index.html');assert.ok(p.llamadas.includes('/api/auth/logout'));assert.equal(p.llamadas.includes('fade-carga'),false);
});
test('el primer toque envía actividad antes de navegar y conserva la petición al salir', () => {
  const p=pagina();p.avanzar(10000);p.eventos.pointerdown({isTrusted:true});
  assert.deepEqual(p.llamadas,['/api/auth/actividad']);assert.equal(p.opciones[0].keepalive,true);
});
test('sin interacción no renueva; avisa y bloquea al vencer', () => {
  const p=pagina(); p.avanzar(100000); assert.equal(p.dialogo().open,true);
  assert.deepEqual(p.llamadas,[]); p.avanzar(120000);
  assert.equal(p.destino,'');assert.ok(p.atributos.has('data-salida-sesion'));p.finalizarSalida();
  assert.equal(p.destino,'/index.html'); assert.ok(p.atributos.has('data-pwa-bloqueada'));
});
test('actividad real renueva, pero tocar el fondo con el aviso abierto no lo hace', async () => {
  const p=pagina();p.avanzar(50000);await p.enviarActividad(); assert.deepEqual(p.llamadas,['/api/auth/actividad']);
  p.avanzar(150000); assert.equal(p.dialogo().open,true); await p.enviarActividad(); assert.equal(p.llamadas.length,1);
  await p.dialogo().children[3].eventos.click(); assert.equal(p.dialogo().open,false); assert.equal(p.llamadas.length,2);
});
test('segundo plano oculta datos y regresar consulta sin renovar', async () => {
  const p=pagina();p.avanzar(100000);assert.equal(p.dialogo().open,true);
  p.document.hidden=true;await p.ejecutar('visibilitychange');assert.ok(p.atributos.has('data-pwa-bloqueada'));
  assert.equal(p.dialogo().open,false);
  p.document.hidden=false;await p.ejecutar('visibilitychange');
  // El callback del evento inicia una comprobación async; dejar que termine.
  for(let i=0;i<5;i++)await Promise.resolve();
  assert.deepEqual(p.llamadas,['/api/auth/sesion','fade-carga']);assert.equal(p.atributos.has('data-pwa-bloqueada'),false);
});

test('la cubierta de retorno ocupa la capa modal para permitir reintentar sobre otros diálogos', async () => {
  const p=pagina();p.document.hidden=true;await p.ejecutar('visibilitychange');
  const cubierta=p.nodos.find(n=>n.className==='pwa-privacidad');
  assert.equal(cubierta.tag,'dialog');assert.equal(cubierta.open,true);
  p.document.hidden=false;await p.ejecutar('visibilitychange');
  for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(cubierta.open,false);assert.equal(cubierta.hidden,true);
});

test('si vuelve al segundo plano durante la comprobación, la respuesta anterior no revela datos', async () => {
  const p=pagina();p.document.hidden=true;await p.ejecutar('visibilitychange');
  p.document.hidden=false;p.eventos.visibilitychange();
  p.document.hidden=true;await p.ejecutar('visibilitychange');
  for(let i=0;i<12;i++)await Promise.resolve();
  assert.ok(p.atributos.has('data-pwa-bloqueada'));
  assert.equal(p.nodos.find(n=>n.className==='pwa-privacidad').hidden,false);
});

test('fallar la comprobación mantiene Reintentar sin entrar en un bucle de consultas', async () => {
  const p=pagina({fallaActividad:true});p.document.hidden=true;await p.ejecutar('visibilitychange');
  p.document.hidden=false;await p.ejecutar('visibilitychange');for(let i=0;i<12;i++)await Promise.resolve();
  assert.deepEqual(p.llamadas,['/api/auth/sesion']);assert.ok(p.atributos.has('data-pwa-bloqueada'));
  const cubierta=p.nodos.find(n=>n.className==='pwa-privacidad');
  assert.equal(cubierta.hidden,false);assert.equal(cubierta.children[0].children[1].textContent,'Reintentar');
});

test('en lectura el aviso ofrece Extender sesión y solo el botón confirma la renovación', async () => {
  for (const opciones of [{pathname:'/promociones.html'}, {pathname:'/detalle.html'}, {lecturaMensaje:true}]) {
    const p=pagina(opciones); p.avanzar(100000);
    const aviso=p.nodos.find(n=>n.className==='pwa-aviso-lectura');
    assert.equal(aviso.hidden,false); assert.equal(aviso.children[1].textContent,'20 s');
    assert.equal(p.dialogo().open,false); assert.deepEqual(p.llamadas,[]);
    await p.enviarActividad(); assert.deepEqual(p.llamadas,[]);
    assert.equal(aviso.children[3].textContent,'Extender sesión');
    await aviso.children[3].eventos.click();
    for(let i=0;i<6;i++) await Promise.resolve();
    assert.equal(aviso.hidden,true); assert.deepEqual(p.llamadas,['/api/auth/actividad']);
  }
});

test('sin interacción también vence en lectura; fallo de renovación conserva aviso y plazo', async () => {
  const p=pagina({pathname:'/promociones.html',fallaActividad:true}); p.avanzar(100000);
  const aviso=p.nodos.find(n=>n.className==='pwa-aviso-lectura');
  await aviso.children[3].eventos.click();
  assert.equal(aviso.hidden,false); assert.match(aviso.children[2].textContent,/No se pudo continuar/);
  p.avanzar(120000);p.finalizarSalida(); assert.equal(p.destino,'/index.html');
});

test('el botón de extensión permanece dentro del diálogo de mensajes y no se vuelve inerte', async () => {
  const p=pagina({lecturaMensaje:true,conDialogo:true});p.avanzar(100000);
  const aviso=p.nodos.find(n=>n.className==='pwa-aviso-lectura');
  assert.equal(aviso.parentNode,p.dialogoLectura);
  await aviso.children[3].eventos.click();assert.equal(aviso.hidden,true);
});

test('al dejar de leer mensajes vuelve el aviso habitual; regresar vencido nunca revela contenido', async () => {
  const p=pagina({lecturaMensaje:true});p.avanzar(100000);
  p.document.body.dataset.lecturaMensaje='false'; p.avanzar(101000);
  assert.equal(p.dialogo().open,true);
  const vencida=pagina({pathname:'/detalle.html',sesionVencida:true});
  vencida.document.hidden=true;await vencida.ejecutar('visibilitychange');
  assert.ok(vencida.atributos.has('data-arranque'));
  vencida.document.hidden=false;await vencida.ejecutar('visibilitychange');
  for(let i=0;i<6;i++)await Promise.resolve();
  vencida.finalizarSalida();assert.equal(vencida.destino,'/index.html');assert.ok(vencida.atributos.has('data-pwa-bloqueada'));
});

test('service worker excluye API y solo recupera navegaciones fallidas', async () => {
  const events={}; let response; const stored=new Response('Recuperación');
  const worker=await readFile(new URL('../../public/pwa/sw.js',import.meta.url),'utf8');
  const context={URL,Request,Response,self:{location:{origin:'https://local.test'},addEventListener(t,f){events[t]=f;}},caches:{match:async()=>stored},fetch:async()=>{throw new Error('sin red');}};
  vm.runInNewContext(worker,context);
  const event=path=>({request:{url:'https://local.test'+path,method:'GET',mode:'navigate'},respondWith(p){response=p;}});
  events.fetch(event('/api/auth/sesion'));assert.equal(response,undefined);
  events.fetch(event('/menu.html'));assert.equal(await (await response).text(),'Recuperación');
});
