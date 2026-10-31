import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, parametro } from './pagina-promociones.js';

test('Promociones conserva aro, filtros y tarjeta durante petición/reintento sin repetir apertura', async () => {
  let respuesta = [];
  const p = await abrirListado({ responder: () => respuesta });
  const aro = p.obtener('#promotions-loading');
  assert.equal(aro.hidden, true);
  let resolver, rechazar;
  respuesta = new Promise((r,j) => { resolver=r; rechazar=j; });
  const consulta = p.chip('Compras').click();
  assert.equal(aro.hidden, false);
  // Sin tarjeta elegida se consultan todas las propias (decisión del 24 de octubre).
  assert.equal(p.consultas.at(-1), '/api/para-ti?categoria=Compras');
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

// H21 (ADR-010): la encuesta es una hoja sobre la lista real. La hoja se abre sola solo la primera vez (marca del servidor);
// después queda un aviso en la lista hasta cerrarlo una vez, y la encuesta sigue disponible desde «Mis preferencias».
const PRIMERA_VEZ={hojaMostrada:false,avisoCerrado:false};
test('H21 la primera vez con la encuesta pendiente la hoja se abre sobre la lista cargada y se guarda la marca', async () => {
  let revelaciones=0;
  const p=await abrirListado({alRevelar:()=>revelaciones++,preferencias:()=>({completed:false}),marcas:PRIMERA_VEZ});
  assert.equal(p.contexto.location.destino,undefined);assert.equal(revelaciones,1);
  assert.equal(p.enlaces().length,3,'la lista real queda detrás de la hoja');
  assert.equal(p.hojas.length,1);
  assert.deepEqual(p.marcasEnviadas,['hoja-mostrada']);
  assert.equal(p.obtener('#encuesta-aviso').hidden,true,'con la hoja abierta no hay aviso');
  const [hoja]=p.hojas;
  // Desde SCRUM-133 Para ti usa todas las tarjetas propias: la hoja trabaja con la misma lista que se ve detrás.
  assert.equal(hoja.perfil.id,'A');assert.deepEqual(hoja.lista.map(promo=>'promo-'+promo.id),p.enlaces().map(enlace=>enlace.id));assert.equal(hoja.categorias.length,3);
  assert.equal(typeof hoja.mostrarVistaPrevia,'function');assert.equal(typeof hoja.alCerrar,'function');
});

test('H21 después de la primera vez queda el aviso en la lista; cerrarlo una vez lo guarda y Empezar abre la hoja', async () => {
  const p=await abrirListado({preferencias:()=>({completed:false}),marcas:{hojaMostrada:true,avisoCerrado:false}});
  assert.equal(p.hojas.length,0,'la hoja no vuelve a abrirse sola');
  assert.equal(p.obtener('#encuesta-aviso').hidden,false);
  await p.obtener('#encuesta-aviso-empezar').click();
  assert.equal(p.hojas.length,1);
  assert.deepEqual(p.marcasEnviadas,[],'abrirla desde el aviso no es la apertura automática');
  const otra=await abrirListado({preferencias:()=>({completed:false}),marcas:{hojaMostrada:true,avisoCerrado:false}});
  await otra.obtener('#encuesta-aviso-cerrar').click();
  assert.equal(otra.obtener('#encuesta-aviso').hidden,true);
  assert.deepEqual(otra.marcasEnviadas,['aviso-cerrado']);
});

test('H21 sin nada que ofrecer no hay hoja ni aviso; desde «Mis preferencias» la hoja siempre se abre', async () => {
  const cerrado=await abrirListado({preferencias:()=>({completed:false}),marcas:{hojaMostrada:true,avisoCerrado:true}});
  assert.equal(cerrado.hojas.length,0);assert.equal(cerrado.obtener('#encuesta-aviso').hidden,true);
  const completada=await abrirListado({preferencias:()=>({completed:true}),marcas:PRIMERA_VEZ});
  assert.equal(completada.hojas.length,0);assert.equal(completada.obtener('#encuesta-aviso').hidden,true);
  const pedida=await abrirListado({search:'?encuesta=1',preferencias:()=>({completed:true}),marcas:{hojaMostrada:true,avisoCerrado:true}});
  assert.equal(pedida.hojas.length,1);
  assert.deepEqual(pedida.marcasEnviadas,[]);
  assert.equal(pedida.history.url.includes('encuesta=1'),false,'volver del detalle no reabre la hoja');
});

test('H21 la vista previa pinta las promociones del motor y cerrar la hoja vuelve a pedir Para ti', async () => {
  const p=await abrirListado({preferencias:()=>({completed:false}),marcas:PRIMERA_VEZ});
  const [hoja]=p.hojas;
  hoja.mostrarVistaPrevia({promociones:[{id:'cine',category:'Entretenimiento'}],contador:'1 promoción para ti'});
  assert.deepEqual(p.enlaces().map(enlace=>enlace.id),['promo-cine']);
  assert.equal(p.obtener('#pr-conteo').textContent,'1 promoción para ti');
  const antes=p.consultas.length;
  await hoja.alCerrar({terminada:true});
  assert.equal(p.consultas.length,antes+1);
  assert.equal(p.enlaces().length,3);
  assert.equal(p.obtener('#survey-notice').hidden,false);
});

test('encuesta completada revela solo tras resolver preferencias; fallo ofrece reintento', async () => {
  let revelaciones=0;
  const p=await abrirListado({alRevelar:()=>revelaciones++,preferencias:()=>{
    assert.equal(revelaciones,0);return {completed:true};
  }});
  assert.equal(p.contexto.location.destino,undefined);assert.equal(revelaciones,1);assert.equal(p.enlaces().length,3);
  const error=await abrirListado({preferencias:()=>{throw new Error('No se pudieron cargar tus preferencias.');}});
  assert.equal(error.obtener('#retry').hidden,false);assert.match(error.obtener('#list-status').textContent,/preferencias/);
  assert.equal(error.contexto.location.destino,undefined);
});

test('H21 la hoja ofrece opciones de todo lo vigente, no solo de la lista ya recortada por intereses', async () => {
  const explorar=[{id:'restaurante',category:'Restaurantes'},{id:'tienda',category:'Compras'},{id:'cine',category:'Entretenimiento'},{id:'salud',category:'Salud'}];
  const p=await abrirListado({search:'?encuesta=1',preferencias:()=>({completed:true}),
    responder:url=>parametro(url,'explorar')==='1'?explorar:[{id:'restaurante',category:'Restaurantes'}]});
  assert.equal(p.enlaces().length,1,'detrás se ve Para ti tal como está');
  assert.ok(p.consultas.includes('/api/para-ti?explorar=1'),'las opciones salen de Explorar, sin filtros');
  assert.deepEqual(p.hojas[0].lista.map(promo=>promo.id),explorar.map(promo=>promo.id));
});
