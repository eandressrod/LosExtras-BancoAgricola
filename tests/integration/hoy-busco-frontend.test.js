// H25 (SCRUM-17 / SCRUM-118): recorrido en Para ti de los chips «Hoy busco».
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { abrirListado, abrirDetalle, parametro } from './pagina-promociones.js';
import { CHIPS_HOY_BUSCO } from '../../public/js/motor/index.js';

// Sin tarjeta elegida, Para ti consulta todas las tarjetas propias y no envía ?tarjeta= (SCRUM-133).
const OFERTAS = [
  { id: 'pizza', merchant: 'Pizza Hut', category: 'Restaurantes', benefit: '2×1', validUntil: '2099-12-31', occasions: { salir: 1 }, intentTags: [] },
  { id: 'siman', merchant: 'Siman', category: 'Compras', benefit: '15 %', validUntil: '2099-12-31', occasions: { salir: 0 }, intentTags: ['regalo'] },
  { id: 'cine', merchant: 'Cinemark', category: 'Entretenimiento', benefit: '2×1', validUntil: '2099-12-31', occasions: { salir: 0.5 }, intentTags: [] }
];

function responderParaTi(url) {
  const intencion = parametro(url, 'intencion');
  const cat = parametro(url, 'categoria');
  const hoy = parametro(url, 'hoy') === '1';
  const com = (parametro(url, 'comercio') ?? '').trim().toLowerCase();
  const filtradas = OFERTAS.filter(p =>
    (!cat || p.category === cat) &&
    (!hoy || p.id !== 'cine') &&
    (!com || p.merchant.toLowerCase().includes(com))
  );
  const conPuntaje = filtradas.map(p => {
    const T = intencion
      ? (intencion === 'regalo' ? (p.intentTags?.includes('regalo') ? 1 : 0) : ((p.occasions?.[intencion] ?? 0) >= 0.5 ? 1 : 0))
      : 0;
    return {
      ...p,
      componentes: { C: 0, M: 0, T, R: 15 * T },
      razon: T === 1 ? { tipo: 'intencion', texto: 'Por lo que buscas hoy' } : null,
      insignias: []
    };
  }).sort((a, b) => b.componentes.R - a.componentes.R);
  return { version: 'prueba', estrategia: intencion ? 'personalizada' : 'base', vacio: conPuntaje.length ? null : 'filtros', promociones: conPuntaje };
}

test('H25 muestra los 12 chips accesibles (11 ocasiones + Regalo) con role="radio", solo uno activo a la vez y se puede quitar', async () => {
  const p = await abrirListado({ responder: responderParaTi });
  const grupo = p.obtener('#intent-filter');
  assert.equal(grupo.attributes.role, 'radiogroup');
  assert.equal(p.chipsIntencion().length, CHIPS_HOY_BUSCO.length);
  assert.equal(p.chipsIntencion().length, 12);
  assert.equal(p.chipsIntencion().at(-1).attributes['aria-label'], 'Regalo');

  for (const chip of p.chipsIntencion()) {
    assert.equal(chip.attributes.role, 'radio');
    assert.equal(chip.attributes['aria-checked'], 'false');
    assert.ok(chip.className.includes('pr-hoy__chip'));
  }
  assert.equal(p.obtener('#intent-status').hidden, true);

  // Activar «Salir con amigos o pareja»
  await p.chipIntencion('Salir con amigos o pareja').click();
  assert.deepEqual(p.intencionActiva(), ['Salir con amigos o pareja']);
  assert.equal(p.obtener('#intent-status').hidden, false);
  assert.equal(p.obtener('#intent-status').textContent, 'Primero: salir con amigos o pareja');
  assert.equal(p.consultas.at(-1), '/api/para-ti?intencion=salir');
  // Reordena sin filtrar (siguen las 3 ofertas, primero las que tienen T=1)
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-pizza', 'promo-cine', 'promo-siman']);
  assert.equal(p.cards.hijos[0].querySelector('.promo-reason').textContent, 'Por lo que buscas hoy');

  // Cambiar a «Regalo»: solo uno activo a la vez
  await p.chipIntencion('Regalo').click();
  assert.deepEqual(p.intencionActiva(), ['Regalo']);
  assert.equal(p.obtener('#intent-status').textContent, 'Primero: regalo');
  assert.equal(p.consultas.at(-1), '/api/para-ti?intencion=regalo');
  assert.deepEqual(p.enlaces().map(e => e.id), ['promo-siman', 'promo-pizza', 'promo-cine']);

  // Pulsar de nuevo el chip activo lo quita y recalcula la instantánea
  await p.chipIntencion('Regalo').click();
  assert.deepEqual(p.intencionActiva(), []);
  assert.equal(p.obtener('#intent-status').hidden, true);
  assert.equal(p.consultas.at(-1), '/api/para-ti');
});

test('H25 (comentario 10035) cada chip muestra una palabra y anuncia su nombre completo, que la contiene', async () => {
  const p = await abrirListado({ responder: responderParaTi });
  assert.equal(p.obtener('#intent-box').hidden, false);
  const visibles = Object.fromEntries(p.chipsIntencion().map(chip => [chip.attributes['aria-label'], chip.textContent]));
  assert.equal(visibles['Salir con amigos o pareja'], 'Salir');
  assert.equal(visibles['Planes en familia'], 'Familia');
  assert.equal(visibles.Regalo, 'Regalo');
  for (const chip of p.chipsIntencion()) {
    assert.ok(chip.textContent, 'cada chip tiene texto visible');
    assert.ok(chip.attributes['aria-label'].toLowerCase().includes(chip.textContent.toLowerCase()), 'el nombre accesible contiene la palabra visible');
  }
});

test('H25 (comentario 10035) la tira y el mensaje «Primero» viven en la cabecera amarilla, bajo la búsqueda, y empiezan ocultos', async () => {
  const html = (await readFile(new URL('../../public/promociones.html', import.meta.url), 'utf8')).replace(/\r\n/g, '\n');
  const cabecera = html.slice(html.indexOf('<section class="pr-hero">'), html.indexOf('</section>', html.indexOf('id="abrir-filtros"')));
  assert.ok(cabecera.indexOf('id="abrir-filtros"') < cabecera.indexOf('id="intent-box"'), 'los chips van bajo la búsqueda');
  assert.match(cabecera, /id="intent-box"[^>]*hidden/);
  assert.match(cabecera, /id="intent-status"/);
  const css = await readFile(new URL('../../public/css/promociones-sistema.css', import.meta.url), 'utf8');
  assert.match(css, /\.pr-hoy__chip\[aria-checked="true"\]/, 'el chip marcado tiene estilo propio del sistema');
});

test('H25 activar o quitar el chip conserva los filtros explícitos, la búsqueda y la tarjeta elegida', async () => {
  const p = await abrirListado({ search: '?categoria=Compras&hoy=1', responder: responderParaTi });
  await p.opcion('Black •••• 7754').click();
  await p.obtener('#merchant-search').input('Siman');
  await p.chipIntencion('Regalo').click();

  assert.equal(p.consultas.at(-1), '/api/para-ti?categoria=Compras&hoy=1&comercio=Siman&intencion=regalo&tarjeta=cta-a-4');
  assert.deepEqual(p.activo(), ['Compras']);
  assert.equal(p.obtener('#today-filter').attributes['aria-pressed'], 'true');
  assert.equal(p.obtener('#merchant-search').value, 'Siman');
  assert.deepEqual(p.tarjetaActiva(), ['Black •••• 7754']);

  // Quitar el chip conserva todos los demás filtros y la tarjeta
  await p.chipIntencion('Regalo').click();
  assert.equal(p.consultas.at(-1), '/api/para-ti?categoria=Compras&hoy=1&comercio=Siman&tarjeta=cta-a-4');
});

test('H25 ir al detalle y volver conserva el chip activo y reutiliza la instantánea sin volver a pedir la API', async () => {
  const p = await abrirListado({ responder: responderParaTi });
  await p.chipIntencion('Salir con amigos o pareja').click();
  assert.equal(p.enlaces()[0].href, '/detalle.html?id=pizza&intencion=salir');

  const detalle = await abrirDetalle({
    search: '?id=pizza&intencion=salir',
    sesion: p.sesion,
    promocion: {id: "pizza"}
  });
  assert.equal(detalle.volver(), '/promociones.html?intencion=salir#promo-pizza');

  const regreso = await abrirListado({
    search: '?intencion=salir',
    hash: '#promo-pizza',
    sesion: p.sesion,
    responder: () => assert.fail('Debe reutilizar la instantánea al volver del detalle con el mismo chip')
  });
  assert.deepEqual(regreso.intencionActiva(), ['Salir con amigos o pareja']);
  assert.equal(regreso.obtener('#intent-status').textContent, 'Primero: salir con amigos o pareja');
  assert.deepEqual(regreso.enlaces().map(e => e.id), ['promo-pizza', 'promo-cine', 'promo-siman']);
});

test('H25 el chip se limpia al cambiar de perfil o al iniciar una visita nueva', async () => {
  const p = await abrirListado({
    search: '?intencion=salir',
    estado: { perfil: 'A', categoria: null },
    perfil: 'B',
    responder: responderParaTi
  });
  assert.deepEqual(p.intencionActiva(), []);
  assert.equal(p.obtener('#intent-status').hidden, true);
  assert.equal(p.history.url, '/promociones.html');
  assert.deepEqual(p.consultas, ['/api/para-ti']);
});
test('H25 (CDA 8) el grupo de chips se maneja con teclado: un solo chip en el orden de tabulación y las flechas mueven y marcan', async () => {
  const p = await abrirListado({ responder: responderParaTi });
  let foco = null;
  for (const chip of p.chipsIntencion()) chip.focus = function () { foco = this; };
  const tecla = async (chip, key) => {
    let evitado = false;
    await chip.listeners.keydown({ key, preventDefault() { evitado = true; } });
    await new Promise(r => setImmediate(r));
    return evitado;
  };
  const indices = () => p.chipsIntencion().map(chip => chip.attributes.tabindex);
  const [primero, segundo] = p.chipsIntencion();
  const ultimo = p.chipsIntencion().at(-1);

  // Sin chip marcado, solo el primero entra en la tabulación.
  assert.deepEqual(indices(), ['0', ...Array(11).fill('-1')]);

  assert.equal(await tecla(primero, 'ArrowRight'), true);
  assert.deepEqual(p.intencionActiva(), [segundo.attributes['aria-label']]);
  assert.equal(foco, segundo);
  assert.equal(p.consultas.at(-1), '/api/para-ti?intencion=rapido-practico');
  assert.equal(segundo.attributes.tabindex, '0');
  assert.equal(primero.attributes.tabindex, '-1');

  await tecla(segundo, 'ArrowLeft');
  assert.equal(foco, primero);
  await tecla(primero, 'ArrowLeft');
  assert.equal(foco, ultimo, 'las flechas dan la vuelta');
  assert.deepEqual(p.intencionActiva(), ['Regalo']);
  await tecla(ultimo, 'Home');
  assert.equal(foco, primero);
  await tecla(primero, 'End');
  assert.equal(foco, ultimo);

  // Otras teclas no se interceptan.
  assert.equal(await tecla(ultimo, 'Tab'), false);
});

test('H25 (CDA 6) un chip en la URL sin visita en curso no se activa: una pestaña nueva empieza sin intención', async () => {
  const p = await abrirListado({ search: '?intencion=salir', responder: responderParaTi });
  assert.deepEqual(p.intencionActiva(), []);
  assert.equal(p.history.url, '/promociones.html');
  assert.deepEqual(p.consultas, ['/api/para-ti']);
});
