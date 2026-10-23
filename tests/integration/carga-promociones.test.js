import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado } from './pagina-promociones.js';

test('Promociones conserva aro, filtros y tarjeta durante petición/reintento sin repetir apertura', async () => {
  let respuesta = [];
  const p = await abrirListado({ responder: () => respuesta });
  const aro = p.obtener('#promotions-loading');
  assert.equal(aro.hidden, true);
  let resolver, rechazar;
  respuesta = new Promise((r,j) => { resolver=r; rechazar=j; });
  const consulta = p.chip('Compras').click();
  assert.equal(aro.hidden, false);
  assert.match(p.consultas.at(-1), /categoria=Compras&tarjeta=cta-a-3/);
  resolver([]); await consulta;
  assert.equal(aro.hidden, true);
  respuesta = new Promise((r,j) => { resolver=r; rechazar=j; });
  const reintento = p.obtener('#retry').click();
  assert.equal(aro.hidden, false);
  rechazar(new Error('Sin conexión')); await reintento;
  assert.equal(aro.hidden, true);
  assert.equal(p.obtener('#retry').hidden, false);
  assert.equal(p.obtener('#list-status').textContent, 'Sin conexión');
  assert.equal(p.pedidas.aperturas, 1);
});

test('una respuesta antigua no retira el aro de la selección más reciente', async () => {
  let respuesta = [];
  const p = await abrirListado({ responder: () => respuesta });
  let finPrimera, finSegunda;
  respuesta = new Promise(r => finPrimera=r);
  const primera = p.chip('Compras').click();
  respuesta = new Promise(r => finSegunda=r);
  const segunda = p.chip('Restaurantes').click();
  finPrimera([]); await primera;
  assert.equal(p.obtener('#promotions-loading').hidden, false);
  finSegunda([]); await segunda;
  assert.equal(p.obtener('#promotions-loading').hidden, true);
});

// H21 (ADR-010): la encuesta es una hoja sobre la lista real; la entrada ya no redirige a encuesta.html.
test('H21 encuesta pendiente abre la hoja sobre la lista cargada, con la tarjeta y las categorías vigentes', async () => {
  let revelaciones=0;
  const p=await abrirListado({search:'?entrada=menu',alRevelar:()=>revelaciones++,preferencias:()=>({completed:false})});
  assert.equal(p.contexto.location.destino,undefined);assert.equal(revelaciones,1);
  assert.equal(p.enlaces().length,3,'la lista real queda detrás de la hoja');
  assert.equal(p.hojas.length,1);
  const [hoja]=p.hojas;
  assert.equal(hoja.perfil.id,'A');assert.equal(hoja.tarjeta.id,'cta-a-3');assert.equal(hoja.categorias.length,3);
  assert.equal(typeof hoja.mostrarVistaPrevia,'function');assert.equal(typeof hoja.alCerrar,'function');
});

test('H21 la hoja no se abre si la encuesta se completó o ya se omitió en esta sesión', async () => {
  const completada=await abrirListado({search:'?entrada=menu',preferencias:()=>({completed:true})});
  assert.equal(completada.hojas.length,0);
  const omitida=await abrirListado({search:'?entrada=menu',preferencias:()=>({completed:false}),omitida:true});
  assert.equal(omitida.hojas.length,0);
  const directa=await abrirListado({preferencias:()=>({completed:false})});
  assert.equal(directa.hojas.length,0);
});

test('H21 la vista previa pinta las promociones del motor y cerrar la hoja vuelve a pedir Para ti', async () => {
  const p=await abrirListado({search:'?entrada=menu',preferencias:()=>({completed:false})});
  const [hoja]=p.hojas;
  hoja.mostrarVistaPrevia({promociones:[{id:'cine',category:'Entretenimiento'}],contador:'1 promoción para ti'});
  assert.deepEqual(p.enlaces().map(enlace=>enlace.id),['promo-cine']);
  assert.equal(p.obtener('#list-status').textContent,'1 promoción para ti');
  const antes=p.consultas.length;
  await hoja.alCerrar({terminada:true});
  assert.equal(p.consultas.length,antes+1);
  assert.equal(p.enlaces().length,3);
  assert.equal(p.obtener('#survey-notice').hidden,false);
});

test('encuesta completada revela solo tras resolver preferencias; fallo ofrece reintento', async () => {
  let revelaciones=0;
  const p=await abrirListado({search:'?entrada=menu',alRevelar:()=>revelaciones++,preferencias:()=>{
    assert.equal(revelaciones,0);return {completed:true};
  }});
  assert.equal(p.contexto.location.destino,undefined);assert.equal(revelaciones,1);assert.equal(p.enlaces().length,3);
  const error=await abrirListado({search:'?entrada=menu',preferencias:()=>{throw new Error('No se pudieron cargar tus preferencias.');}});
  assert.equal(error.obtener('#retry').hidden,false);assert.match(error.obtener('#list-status').textContent,/preferencias/);
  assert.equal(error.contexto.location.destino,undefined);
});
