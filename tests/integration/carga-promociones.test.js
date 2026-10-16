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

test('encuesta pendiente decide el destino sin revelar ni consultar el catálogo de Promociones', async () => {
  let revelaciones=0;
  const p=await abrirListado({search:'?entrada=menu',alRevelar:()=>revelaciones++,preferencias:()=>{
    assert.equal(revelaciones,0);return {completed:false};
  }});
  assert.equal(p.contexto.location.destino,'/encuesta.html');assert.equal(revelaciones,0);
  assert.equal(p.pedidas.categorias,0);assert.equal(p.pedidas.tarjetas,0);assert.equal(p.consultas.length,0);
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
