import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { estadoInactividad, plazoLocal } from '../../public/pwa/inactividad-modelo.js';
const source = (await readFile(new URL('../../public/pwa/inactividad.js',import.meta.url),'utf8')).replace(/^import[^\n]+\n/gm,'').replaceAll('export function','function');
function pagina() {
  let tiempo = 0; let intervalo; let destino = ''; const llamadas = []; const opciones = []; const tareas = new Map(); let id = 0;
  const eventos = {}; const nodos = []; const atributos = new Set();
  const crear = tag => {
    const e = { tag, hidden:false, open:false, disabled:false, children:[], eventos:{}, textContent:'',
      append(...children) { this.children.push(...children); }, replaceChildren(...children) { this.children=children; },
      setAttribute() {}, addEventListener(t,f) { this.eventos[t]=f; }, showModal() { this.open=true; }, close() { this.open=false; } };
    nodos.push(e); return e;
  };
  const document = { hidden:false, createElement:crear, body:{append(){}}, documentElement:{setAttribute(k){atributos.add(k);},removeAttribute(k){atributos.delete(k);}},addEventListener(t,f){eventos[t]=f;} };
  const storage = {setItem(){},removeItem(){}};
  const estado = {id:'sesion',ahora:0,inactivaEn:120000,expiraEn:7200000};
  const context = {document,localStorage:storage,sessionStorage:storage,Date:{now:()=>tiempo},Math,Number,JSON,
    location:{replace(url){destino=url;},reload(){destino='reload';}},addEventListener(t,f){eventos[t]=f;},
    setInterval(fn){intervalo=fn;},clearTimeout(key){tareas.delete(key);},setTimeout(fn){tareas.set(++id,fn);return id;},estadoInactividad:(plazo)=>estadoInactividad(plazo,tiempo),plazoLocal:s=>plazoLocal(s,tiempo),
    async fetch(url,options){llamadas.push(url);opciones.push(options);return {ok:true,status:200,json:async()=>({perfil:{id:'A'},sesion:{...estado,ahora:tiempo,inactivaEn:tiempo+120000}})};}
  };
  vm.runInNewContext(source+'\nactualizarSesion('+JSON.stringify(estado)+'); iniciarInactividad();',context);
  return {document,eventos,nodos,atributos,llamadas,opciones,get destino(){return destino;},avanzar(ms){tiempo=ms;intervalo();},async enviarActividad(){await eventos.pointerdown({isTrusted:true});for(const [key,fn] of tareas){tareas.delete(key);await fn();}},async ejecutar(t){await eventos[t]();},dialogo:()=>nodos.find(n=>n.tag==='dialog')};
}
test('el primer toque envía actividad antes de navegar y conserva la petición al salir', () => {
  const p=pagina();p.avanzar(10000);p.eventos.pointerdown({isTrusted:true});
  assert.deepEqual(p.llamadas,['/api/auth/actividad']);assert.equal(p.opciones[0].keepalive,true);
});
test('sin interacción no renueva; avisa y bloquea al vencer', () => {
  const p=pagina(); p.avanzar(100000); assert.equal(p.dialogo().open,true);
  assert.deepEqual(p.llamadas,[]); p.avanzar(120000);
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
  assert.deepEqual(p.llamadas,['/api/auth/sesion']);assert.equal(p.atributos.has('data-pwa-bloqueada'),false);
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
