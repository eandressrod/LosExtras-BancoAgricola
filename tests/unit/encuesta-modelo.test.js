import test from 'node:test';
import assert from 'node:assert/strict';
import {
  opcionesIntereses, categoriasAfinar, opcionesAfinar, ordenSorteado, alternar, seleccionVacia, textoBotonPrincipal,
  pasosEncuesta, senalesDePagina, cambiosSenales, buscarOpciones, textoContador, anuncioVistaPrevia,
  ofertaEncuesta
} from '../../public/js/encuesta-modelo.js';

const oferta = (id, merchantId, category, extra = {}) => ({
  id, merchantId, merchant: merchantId.toUpperCase(), category, categoryName: category, canUse: true,
  recognizable: true, sensitive: false, refineBy: 'comercio', priceLevel: 1,
  subcategoryId: category + '-sub', subcategoryName: category + ' sub', logoUrl: `/recursos/comercios/${merchantId}.png`, ...extra
});
const categoria = (id, orden, subcategorias = []) => ({ id, nombre: id, icono_url: `/recursos/categorias/${id}.svg`, orden, subcategorias });
const almacen = () => {
  const datos = new Map();
  return { datos, get length() { return datos.size; }, key: i => [...datos.keys()][i] ?? null,
    getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)), removeItem: k => datos.delete(k) };
};

test('H21 página 1: hasta 8 categorías con más promociones aplicables, sin categorías vacías ni ofertas no utilizables', () => {
  const categorias = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((id, i) => categoria(id, i + 1));
  const ofertas = [
    ...['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'].map((c, i) => oferta('o' + i, 'm' + i, c)),
    oferta('b2', 'mb', 'B'), oferta('i2', 'mi', 'I'), oferta('i3', 'mi2', 'I'),
    oferta('vencida', 'mj', 'J', { canUse: false })
  ];
  const opciones = opcionesIntereses(ofertas, categorias);
  assert.equal(opciones.length, 8);
  assert.deepEqual(opciones.slice(0, 2).map(o => o.id), ['I', 'B']);
  assert.ok(!opciones.some(o => o.id === 'J'));
  assert.deepEqual(opciones[0], { id: 'I', nombre: 'I', icono: '/recursos/categorias/I.svg', total: 3 });
  // Con el mismo total se respeta el orden del catálogo.
  assert.deepEqual(opciones.slice(2).map(o => o.id), ['A', 'C', 'D', 'E', 'F', 'G']);
});

test('H21 página 2: como máximo 3 categorías elegidas, de más a menos promociones, saltando las que no se afinan', () => {
  const ofertas = [
    oferta('r1', 'r1', 'Restaurantes'), oferta('r2', 'r2', 'Restaurantes'), oferta('r3', 'r3', 'Restaurantes'),
    oferta('c1', 'c1', 'Compras'), oferta('c2', 'c2', 'Compras'),
    oferta('e1', 'cine', 'Entretenimiento', { refineBy: 'no' }), oferta('e2', 'cine', 'Entretenimiento', { refineBy: 'no' }),
    oferta('t1', 't1', 'Tecnologia'), oferta('s1', 's1', 'Salud', { sensitive: true, refineBy: 'subcategoria' })
  ];
  assert.deepEqual(categoriasAfinar(['Compras', 'Entretenimiento', 'Restaurantes'], ofertas), ['Restaurantes', 'Compras']);
  // Con el mismo número de promociones se conserva el orden en que se eligieron.
  assert.deepEqual(categoriasAfinar(['Tecnologia', 'Salud', 'Compras', 'Restaurantes'], ofertas), ['Restaurantes', 'Compras', 'Tecnologia']);
  assert.deepEqual(categoriasAfinar([], ofertas), []);
});

test('H21 página 2: seis comercios aplicables, priorizando reconocibles y variando subcategoría y precio', () => {
  const ofertas = [
    oferta('a', 'a', 'R', { subcategoryId: 'rapida', priceLevel: 1 }),
    oferta('a2', 'a', 'R', { subcategoryId: 'rapida', priceLevel: 1 }),
    oferta('b', 'b', 'R', { subcategoryId: 'rapida', priceLevel: 1 }),
    oferta('c', 'c', 'R', { subcategoryId: 'cafe', priceLevel: 3 }),
    oferta('d', 'd', 'R', { subcategoryId: 'pizza', priceLevel: 2 }),
    oferta('e', 'e', 'R', { subcategoryId: 'rapida', priceLevel: 1, recognizable: false }),
    oferta('f', 'f', 'R', { subcategoryId: 'tipica', priceLevel: 2, recognizable: false }),
    oferta('g', 'g', 'R', { subcategoryId: 'rapida', priceLevel: 1 }),
    oferta('h', 'h', 'R', { subcategoryId: 'rapida', priceLevel: 1, canUse: false }),
    oferta('otra', 'x', 'Otra')
  ];
  const { modo, opciones } = opcionesAfinar('R', ofertas, 'perfil-A');
  assert.equal(modo, 'comercio');
  assert.equal(opciones.length, 6);
  const ids = opciones.map(o => o.id).sort();
  // Los reconocibles de subcategorías distintas entran antes que un no reconocible de la subcategoría repetida.
  for (const id of ['c', 'd', 'f']) assert.ok(ids.includes(id), id);
  assert.ok(!ids.includes('h') && !ids.includes('x'));
  assert.equal(new Set(ids).size, 6);
  assert.deepEqual(opciones.find(o => o.id === 'a'), { id: 'a', nombre: 'A', imagen: '/recursos/comercios/a.png', ambito: 'comercio' });
});

test('H21 página 2: el orden de presentación se sortea por persona y es estable', () => {
  const ofertas = ['a', 'b', 'c', 'd', 'e', 'f'].map((id, i) => oferta(id, id, 'R', { subcategoryId: 's' + i, priceLevel: (i % 3) + 1 }));
  const primera = opcionesAfinar('R', ofertas, 'perfil-A').opciones.map(o => o.id);
  assert.deepEqual(opcionesAfinar('R', ofertas, 'perfil-A').opciones.map(o => o.id), primera);
  const otras = ['perfil-B', 'perfil-C', 'perfil-D', 'perfil-E'].map(s => opcionesAfinar('R', ofertas, s).opciones.map(o => o.id).join());
  assert.ok(otras.some(orden => orden !== primera.join()), 'otra persona ve otro orden');
  assert.deepEqual(ordenSorteado(['x', 'y', 'z'], 'semilla'), ordenSorteado(['x', 'y', 'z'], 'semilla'));
  assert.deepEqual([...ordenSorteado(['x', 'y', 'z'], 'semilla')].sort(), ['x', 'y', 'z']);
});

test('H21 página 2: en categorías sensibles se ofrecen subcategorías, nunca marcas', () => {
  const ofertas = [
    oferta('g1', 'gnc', 'Salud', { sensitive: true, subcategoryId: 'vitaminas', subcategoryName: 'Vitaminas' }),
    oferta('g2', 'gnc', 'Salud', { sensitive: true, subcategoryId: 'vitaminas', subcategoryName: 'Vitaminas' }),
    oferta('f1', 'farma', 'Salud', { sensitive: false, subcategoryId: 'farmacias', subcategoryName: 'Farmacias' })
  ];
  const { modo, opciones } = opcionesAfinar('Salud', ofertas, 'perfil-A');
  assert.equal(modo, 'subcategoria');
  assert.deepEqual(opciones.map(o => o.id).sort(), ['farmacias', 'vitaminas']);
  assert.ok(opciones.every(o => o.ambito === 'subcategoria' && !o.imagen));
});

test('H21 página 2: un comercio que se afina por subcategoría aparece como su subcategoría y los que no se afinan se omiten', () => {
  const ofertas = [
    oferta('s', 'siman', 'Compras'),
    oferta('p', 'payless', 'Compras', { refineBy: 'subcategoria', subcategoryId: 'calzado', subcategoryName: 'Calzado' }),
    oferta('n', 'nada', 'Compras', { refineBy: 'no' })
  ];
  const { opciones } = opcionesAfinar('Compras', ofertas, 'perfil-A');
  assert.deepEqual(opciones.map(o => `${o.ambito}:${o.id}`).sort(), ['comercio:siman', 'subcategoria:calzado']);
});

test('H21 reglas de selección: multiselección libre, una opción en canal y descubrir, hasta 2 beneficios con «Me da igual» exclusiva', () => {
  let s = seleccionVacia();
  assert.deepEqual(s, { categorias: [], afinar: {}, canal: null, beneficio: [], descubrir: null });
  s = alternar(s, 'categorias', 'A');
  s = alternar(s, 'categorias', 'B');
  assert.deepEqual(s.categorias, ['A', 'B']);
  assert.deepEqual(alternar(s, 'categorias', 'A').categorias, ['B']);

  s = alternar(s, 'afinar', 'comercio:a', 'R');
  s = alternar(s, 'afinar', 'subcategoria:b', 'R');
  assert.deepEqual(s.afinar.R, ['comercio:a', 'subcategoria:b']);
  assert.deepEqual(alternar(s, 'afinar', 'ninguno', 'R').afinar.R, ['ninguno']);
  assert.deepEqual(alternar(alternar(s, 'afinar', 'ninguno', 'R'), 'afinar', 'comercio:a', 'R').afinar.R, ['comercio:a']);

  s = alternar(s, 'canal', 'presencial');
  assert.equal(alternar(s, 'canal', 'delivery').canal, 'delivery');
  assert.equal(alternar(s, 'canal', 'presencial').canal, null);
  assert.equal(alternar(s, 'descubrir', 'nuevos').descubrir, 'nuevos');

  s = alternar(s, 'beneficio', 'descuento');
  s = alternar(s, 'beneficio', '2x1-combo');
  assert.deepEqual(alternar(s, 'beneficio', 'cuotas-sin-intereses').beneficio, ['descuento', '2x1-combo'], 'no pasa de 2');
  assert.deepEqual(alternar(s, 'beneficio', 'indiferente').beneficio, ['indiferente']);
  assert.deepEqual(alternar(alternar(s, 'beneficio', 'indiferente'), 'beneficio', 'descuento').beneficio, ['descuento']);
  assert.deepEqual(alternar(s, 'beneficio', 'descuento').beneficio, ['2x1-combo']);
});

test('H21 el botón principal nunca se deshabilita: Saltar este paso, Siguiente o Listo solo en la última página', () => {
  assert.equal(textoBotonPrincipal(false, false), 'Saltar este paso');
  assert.equal(textoBotonPrincipal(false, true), 'Siguiente');
  assert.equal(textoBotonPrincipal(true, false), 'Listo');
  assert.equal(textoBotonPrincipal(true, true), 'Listo');
});

// P3: una pregunta por pantalla. El paso 3 se divide en una página por criterio, como el paso 2 por categoría.
test('H21 páginas de la encuesta: intereses, una por categoría que se afina y una por cada pregunta del paso 3', () => {
  const criterios = [{ pagina: 3, criterio: 'canal' }, { pagina: 3, criterio: 'beneficio' }, { pagina: 3, criterio: 'descubrir' }];
  assert.deepEqual(pasosEncuesta([]), [{ pagina: 1 }, ...criterios]);
  assert.deepEqual(pasosEncuesta(['Restaurantes', 'Salud']),
    [{ pagina: 1 }, { pagina: 2, categoria: 'Restaurantes' }, { pagina: 2, categoria: 'Salud' }, ...criterios]);
});

test('H21 señales por página con origen encuesta; «Ninguno de estos» no escribe y la indiferencia se declara', () => {
  let s = seleccionVacia();
  s = alternar(alternar(s, 'categorias', 'Restaurantes'), 'categorias', 'Salud');
  assert.deepEqual(senalesDePagina(1, s), [
    { clase: 'interes', ambito: 'categoria', valor: 'Restaurantes', origen: 'encuesta' },
    { clase: 'interes', ambito: 'categoria', valor: 'Salud', origen: 'encuesta' }
  ]);
  s = alternar(s, 'afinar', 'comercio:starbucks', 'Restaurantes');
  s = alternar(s, 'afinar', 'subcategoria:farmacias', 'Salud');
  assert.deepEqual(senalesDePagina(2, s, 'Restaurantes'), [{ clase: 'interes', ambito: 'comercio', valor: 'starbucks', origen: 'encuesta' }]);
  assert.deepEqual(senalesDePagina(2, s, 'Salud'), [{ clase: 'interes', ambito: 'subcategoria', valor: 'farmacias', origen: 'encuesta' }]);
  assert.deepEqual(senalesDePagina(2, alternar(s, 'afinar', 'ninguno', 'Salud'), 'Salud'), []);
  s = alternar(alternar(alternar(s, 'canal', 'indiferente'), 'beneficio', 'indiferente'), 'descubrir', 'mezcla');
  assert.deepEqual(senalesDePagina(3, s), [
    { clase: 'criterio', ambito: 'canal', valor: 'indiferente', origen: 'encuesta' },
    { clase: 'criterio', ambito: 'beneficio', valor: 'indiferente', origen: 'encuesta' },
    { clase: 'criterio', ambito: 'descubrir', valor: 'mezcla', origen: 'encuesta' }
  ]);
  assert.deepEqual(senalesDePagina(3, seleccionVacia()), []);
  // Cada página del paso 3 confirma solo su pregunta.
  assert.deepEqual(senalesDePagina(3, s, 'canal'), [{ clase: 'criterio', ambito: 'canal', valor: 'indiferente', origen: 'encuesta' }]);
  assert.deepEqual(senalesDePagina(3, s, 'beneficio'), [{ clase: 'criterio', ambito: 'beneficio', valor: 'indiferente', origen: 'encuesta' }]);
  assert.deepEqual(senalesDePagina(3, s, 'descubrir'), [{ clase: 'criterio', ambito: 'descubrir', valor: 'mezcla', origen: 'encuesta' }]);
});

test('H21 al confirmar una página se activa lo nuevo y se desactiva solo lo que dejó de elegirse en esa página', () => {
  const activas = [
    { id: 1, clase: 'interes', ambito: 'categoria', valor: 'Restaurantes' },
    { id: 2, clase: 'interes', ambito: 'categoria', valor: 'Compras' },
    { id: 3, clase: 'interes', ambito: 'comercio', valor: 'starbucks' },
    { id: 4, clase: 'interes', ambito: 'comercio', valor: 'siman' },
    { id: 5, clase: 'criterio', ambito: 'canal', valor: 'presencial' }
  ];
  const deseadas = [{ clase: 'interes', ambito: 'categoria', valor: 'Restaurantes', origen: 'encuesta' },
    { clase: 'interes', ambito: 'categoria', valor: 'Salud', origen: 'encuesta' }];
  const pagina1 = cambiosSenales(activas, deseadas, s => s.clase === 'interes' && s.ambito === 'categoria');
  assert.deepEqual(pagina1, { activar: [deseadas[1]], desactivar: [2] });
  // Página 2 de Restaurantes: el alcance son las opciones mostradas; Siman (de otra categoría) no se toca.
  const opciones = new Set(['comercio:starbucks', 'comercio:pollo-campero']);
  const pagina2 = cambiosSenales(activas, [], s => opciones.has(`${s.ambito}:${s.valor}`));
  assert.deepEqual(pagina2, { activar: [], desactivar: [3] });
});

test('H21 (ADR-010) la hoja se abre sola la primera vez; después queda el aviso hasta cerrarlo una vez', () => {
  const marcas = (hojaMostrada, avisoCerrado) => ({ hojaMostrada, avisoCerrado });
  assert.equal(ofertaEncuesta({ pendiente: true, ...marcas(false, false) }), 'hoja');
  assert.equal(ofertaEncuesta({ pendiente: true, ...marcas(true, false) }), 'aviso');
  assert.equal(ofertaEncuesta({ pendiente: true, ...marcas(true, true) }), null, 'cerrado una vez, no vuelve');
  assert.equal(ofertaEncuesta({ pendiente: false, ...marcas(false, false) }), null, 'completada: nada que ofrecer');
  // Desde «Mis preferencias» la encuesta siempre se abre, aunque esté completada o el aviso cerrado.
  assert.equal(ofertaEncuesta({ pendiente: false, pedida: true, ...marcas(true, true) }), 'hoja');
  assert.equal(ofertaEncuesta({ pendiente: true }), 'hoja', 'sin marcas leídas se trata como primera vez');
});

test('H21 buscar encuentra por nombre o subcategoría sin distinguir mayúsculas ni tildes', () => {
  const opciones = [
    { id: 'Tecnologia', nombre: 'Tecnología', subcategorias: [{ nombre: 'Telefonía e internet' }] },
    { id: 'Salud', nombre: 'Salud', subcategorias: [{ nombre: 'Ópticas' }] }
  ];
  assert.deepEqual(buscarOpciones(opciones, 'tecno').map(o => o.id), ['Tecnologia']);
  assert.deepEqual(buscarOpciones(opciones, 'OPTICA').map(o => o.id), ['Salud']);
  assert.deepEqual(buscarOpciones(opciones, '  ').map(o => o.id), []);
});

test('H21 vista previa: contador sin ahorros y anuncio solo cuando cambia lo primero que se ve', () => {
  assert.equal(textoContador(0), 'No hay promociones para lo que elegiste.');
  assert.equal(textoContador(1), '1 promoción para ti');
  assert.equal(textoContador(12), '12 promociones para ti');
  const antes = [{ id: 'a', categoryName: 'Compras' }, { id: 'b', categoryName: 'Compras' }];
  assert.equal(anuncioVistaPrevia(antes, antes), '');
  assert.equal(anuncioVistaPrevia(antes, [{ id: 'c', categoryName: 'Restaurantes' }]), 'Ahora ves primero promociones de Restaurantes');
  assert.equal(anuncioVistaPrevia(antes, []), 'No hay promociones para lo que elegiste.');
});
