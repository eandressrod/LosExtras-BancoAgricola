// H23: correcciones desde la tarjeta de Para ti (página real con el arnés compartido) y pregunta en contexto.
import test from 'node:test';
import assert from 'node:assert/strict';
import { abrirListado, almacen } from './pagina-promociones.js';

const PIZZA = { id: 'pizza-hut-miercoles', merchantId: 'pizza-hut', merchant: 'Pizza Hut', category: 'Restaurantes', categoryName: 'Restaurantes', benefit: '2x1' };
const CINE = { id: 'cine', merchantId: 'cine', merchant: 'Cinemark', category: 'Entretenimiento', categoryName: 'Entretenimiento', benefit: '20 %' };
const TACOS = { id: 'tacos', merchantId: 'tacos', merchant: 'Taco Bell', category: 'Restaurantes', categoryName: 'Restaurantes', benefit: '10 %' };

/** Servidor falso de /api/guardadas, /api/senales y /api/preguntas; registra cada petición de escritura. */
function servidor({ senales = [], fallos = 0 } = {}) {
  const estado = { senales: [...senales], fallos, escrituras: [] };
  const responder = (datos, status = 200) => ({ ok: status === 200, status, json: async () => datos });
  estado.fetch = async (url, opciones = {}) => {
    const metodo = opciones.method ?? 'GET';
    if (url === '/api/guardadas') return responder({ ids: [] });
    if (metodo === 'GET' && url === '/api/senales') return responder({ senales: estado.senales.filter(s => s.activa) });
    const cuerpo = JSON.parse(opciones.body ?? 'null');
    estado.escrituras.push({ url, metodo, cuerpo });
    if (estado.fallos > 0) { estado.fallos -= 1; return responder({ error: 'Servicio no disponible' }, 503); }
    if (url === '/api/preguntas') return responder({ deshacer: cuerpo.respuesta === 'si' ? [{ id: 90, activa: false }] : [] });
    if (metodo === 'POST') {
      const senal = { id: 50 + estado.senales.length, ...cuerpo, creadaEn: '', activa: true };
      estado.senales.push(senal);
      return responder({ senal, deshacer: [{ id: senal.id, activa: false }] });
    }
    const senal = estado.senales.find(s => s.id === cuerpo.id);
    if (senal) senal.activa = cuerpo.activa;
    return responder({ senal });
  };
  return estado;
}

async function abrir({ promociones = [PIZZA, CINE], pregunta = null, server = servidor(), sesion = almacen(), search = '' } = {}) {
  const p = await abrirListado({
    perfil: 'B', search, sesion, fetch: server.fetch,
    responder: () => ({ version: 'prueba', estrategia: 'personalizada', vacio: null, promociones, pregunta })
  });
  const ofertas = () => p.cards.hijos.filter(nodo => nodo.querySelector('.promo-opciones').onclick);
  const acciones = () => p.obtener('#acciones-lista').children;
  const accion = texto => acciones().find(boton => boton.textContent === texto);
  const abrirOpciones = async indice => ofertas()[indice].querySelector('.promo-opciones').onclick();
  return { ...p, server, ofertas, acciones, accion, abrirOpciones };
}

test('H23 cada tarjeta tiene Opciones fuera del enlace y la hoja ofrece las cuatro correcciones sin marcar', async () => {
  const p = await abrir();
  const opciones = p.ofertas()[0].querySelector('.promo-opciones');
  assert.equal(opciones.attributes['aria-label'], 'Opciones de Pizza Hut');
  await p.abrirOpciones(0);
  assert.equal(p.obtener('#acciones').open, true);
  assert.equal(p.obtener('#acciones-titulo').textContent, 'Pizza Hut');
  assert.deepEqual(p.acciones().map(b => [b.textContent, b.attributes['aria-pressed']]), [
    ['No me interesa esta promo', 'false'], ['Más de este comercio', 'false'], ['Menos de este comercio', 'false'], ['No mostrar Restaurantes', 'false']
  ]);
});

test('H23 «No me interesa» guarda la señal, recalcula con la misma consulta y ofrece deshacer en el aviso', async () => {
  const p = await abrir({ search: '?hoy=1' });
  const antes = p.consultas.at(-1);
  await p.abrirOpciones(0);
  await p.accion('No me interesa esta promo').click();
  assert.deepEqual(p.server.escrituras[0], { url: '/api/senales', metodo: 'POST',
    cuerpo: { clase: 'rechazo', ambito: 'oferta', valor: 'pizza-hut-miercoles', origen: 'tarjeta' } });
  assert.equal(p.obtener('#acciones').open, false);
  assert.equal(p.consultas.length, 2, 'recalcula la instantánea');
  assert.equal(p.consultas.at(-1), antes, 'conserva filtros, búsqueda y tarjeta');
  const aviso = p.aviso.mostrados.at(-1);
  assert.equal(aviso.texto, 'No verás esta promoción en Para ti.');
  await aviso.alDeshacer();
  assert.deepEqual(p.server.escrituras[1], { url: '/api/senales', metodo: 'PATCH', cuerpo: { id: 50, activa: false } });
  assert.equal(p.consultas.length, 3);
  assert.equal(p.aviso.mostrados.length, 1, 'deshacer no abre otro aviso');
});

test('H23 si guardar falla, la hoja sigue abierta con el error y sin falso éxito; reintentar funciona', async () => {
  const p = await abrir({ server: servidor({ fallos: 1 }) });
  await p.abrirOpciones(0);
  await p.accion('Menos de este comercio').click();
  assert.equal(p.obtener('#acciones').open, true);
  assert.equal(p.obtener('#acciones-error').textContent, 'No se pudo guardar tu cambio. Intenta de nuevo.');
  assert.equal(p.aviso.mostrados.length, 0);
  assert.equal(p.consultas.length, 1);
  assert.ok(p.acciones().every(boton => !boton.disabled));
  await p.accion('Menos de este comercio').click();
  assert.equal(p.obtener('#acciones').open, false);
  assert.equal(p.aviso.mostrados.at(-1).texto, 'Verás menos de Pizza Hut.');
});

test('H23 una oferta rechazada que aparece por filtro o búsqueda se ve marcada y se deshace desde su tarjeta', async () => {
  const senal = { id: 7, clase: 'rechazo', ambito: 'oferta', valor: PIZZA.id, origen: 'tarjeta', creadaEn: '', activa: true };
  const p = await abrir({ search: '?comercio=pizza', server: servidor({ senales: [senal] }) });
  const [pizza, cine] = p.ofertas();
  assert.equal(pizza.querySelector('article').dataset.descartada, 'si');
  assert.equal(pizza.querySelector('.promo-marca').hidden, false);
  assert.equal(pizza.querySelector('.promo-marca').textContent, 'Marcaste que no te interesa');
  assert.equal(cine.querySelector('.promo-marca').hidden, true);
  await p.abrirOpciones(0);
  assert.equal(p.accion('No me interesa esta promo').attributes['aria-pressed'], 'true');
  await p.accion('No me interesa esta promo').click();
  assert.deepEqual(p.server.escrituras[0].cuerpo, { id: 7, activa: false });
  assert.equal(p.aviso.mostrados.at(-1).texto, 'Se deshizo tu cambio.');
  await p.aviso.mostrados.at(-1).alDeshacer();
  assert.deepEqual(p.server.escrituras[1].cuerpo, { id: 7, activa: true });
});

const PREGUNTA = { tipo: 'excluir-categoria', categoria: 'Restaurantes', nombre: 'Restaurantes' };
const pregunta = p => p.cards.hijos.find(nodo => nodo.querySelector('.pr-pregunta__texto').textContent);

test('H23 la pregunta en contexto va dentro de la lista, una vez por visita', async () => {
  const sesion = almacen();
  const p = await abrir({ promociones: [PIZZA, CINE, TACOS], pregunta: PREGUNTA, sesion });
  const tarjeta = pregunta(p);
  assert.equal(p.cards.hijos.indexOf(tarjeta), 2);
  assert.equal(tarjeta.querySelector('.pr-pregunta__texto').textContent, '¿Dejamos de mostrarte Restaurantes?');
  const otra = await abrir({ promociones: [PIZZA], pregunta: PREGUNTA, sesion });
  assert.equal(pregunta(otra), undefined);
});

test('H23 «Sí» excluye la categoría con deshacer; «No» se guarda; «Ahora no» solo la retira', async () => {
  const si = await abrir({ pregunta: PREGUNTA });
  await pregunta(si).querySelector('[data-respuesta="si"]').click();
  assert.deepEqual(si.server.escrituras[0], { url: '/api/preguntas', metodo: 'POST',
    cuerpo: { pregunta: 'excluir-categoria', valor: 'Restaurantes', respuesta: 'si' } });
  assert.equal(si.consultas.length, 2);
  assert.equal(si.aviso.mostrados.at(-1).texto, 'No verás Restaurantes en Para ti.');
  await si.aviso.mostrados.at(-1).alDeshacer();
  assert.deepEqual(si.server.escrituras[1].cuerpo, { id: 90, activa: false });

  const no = await abrir({ pregunta: PREGUNTA });
  const tarjetaNo = pregunta(no);
  await tarjetaNo.querySelector('[data-respuesta="no"]').click();
  assert.equal(no.server.escrituras[0].cuerpo.respuesta, 'no');
  assert.equal(tarjetaNo.querySelector('article').hidden, true);

  const ahora = await abrir({ pregunta: PREGUNTA });
  const tarjetaAhora = pregunta(ahora);
  await tarjetaAhora.querySelector('[data-respuesta="ahora-no"]').click();
  assert.equal(ahora.server.escrituras.length, 0);
  assert.equal(tarjetaAhora.querySelector('article').hidden, true);
});

test('H23 si la respuesta no se guarda, la pregunta sigue visible con el error', async () => {
  const p = await abrir({ pregunta: PREGUNTA, server: servidor({ fallos: 1 }) });
  const tarjeta = pregunta(p);
  await tarjeta.querySelector('[data-respuesta="no"]').click();
  assert.equal(tarjeta.querySelector('article').hidden, false);
  assert.equal(tarjeta.querySelector('.pr-pregunta__error').textContent, 'No se pudo guardar tu respuesta. Intenta de nuevo.');
});
