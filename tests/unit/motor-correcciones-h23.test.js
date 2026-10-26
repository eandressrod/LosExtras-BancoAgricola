// H23 (SCRUM-117): reglas de rechazo como funciones puras, conectadas al motor de H22 por ReglasExternas.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ordenarParaTi } from '../../public/js/motor/index.js';
import { CONFIGURACION } from '../../public/js/motor/config.js';
import {
  reglasCorrecciones, efectosDeDeclarar, estadoCorrecciones, preguntaPendiente
} from '../../public/js/motor/correcciones.js';

const oferta = (id, merchantId, category, addedOn = '2026-10-10') => ({
  id, merchantId, merchant: merchantId.toUpperCase(), category, categoryName: category, addedOn,
  availableToday: false, canUse: true, benefit: '10 %', applicableCard: 'basica', usageDays: null,
  channels: ['presencial'], benefitType: 'descuento'
});
const OFERTAS = [
  oferta('pizza-1', 'pizza', 'Restaurantes', '2026-10-20'), oferta('pizza-2', 'pizza', 'Restaurantes', '2026-10-19'),
  oferta('sushi-1', 'sushi', 'Restaurantes', '2026-10-18'), oferta('tacos-1', 'tacos', 'Restaurantes', '2026-10-17'),
  oferta('cine-1', 'cine', 'Entretenimiento', '2026-10-16'), oferta('siman-1', 'siman', 'Compras', '2026-10-15')
];

let siguiente = 1;
const senal = (clase, ambito, valor, extra = {}) =>
  ({ id: siguiente++, clase, ambito, valor, origen: 'tarjeta', creadaEn: '2026-10-21T17:00:00.000Z', activa: true, ...extra });
const interes = (ambito, valor) => senal('interes', ambito, valor, { origen: 'encuesta' });
const rechazo = (ambito, valor, extra) => senal('rechazo', ambito, valor, extra);

const ordenar = (senales, filtros = {}) =>
  ordenarParaTi({ ofertas: OFERTAS, senales, filtros, reglas: reglasCorrecciones(filtros) });
const ids = respuesta => respuesta.promociones.map(o => o.id);
const R = (respuesta, id) => respuesta.promociones.find(o => o.id === id)?.componentes.R;

const INTERESES = [interes('categoria', 'Restaurantes'), interes('categoria', 'Entretenimiento')];

test('H23 los parámetros de las correcciones viven en la configuración versionada', () => {
  assert.deepEqual(CONFIGURACION.correcciones, { factorMenos: 0.3, menosParaPreguntar: 3, diasSinRepetirPregunta: 30 });
  assert.ok(Object.isFrozen(CONFIGURACION.correcciones));
  assert.notEqual(CONFIGURACION.version, '2026-10-23.1');
});

test('H23 «No me interesa esta promo» la saca de Para ti sin retirar otras de su comercio ni de su categoría', () => {
  const antes = ids(ordenar(INTERESES));
  const despues = ids(ordenar([...INTERESES, rechazo('oferta', 'pizza-1')]));
  assert.ok(antes.includes('pizza-1'));
  // El armado por variedad puede recolocar al resto; lo que importa es que solo falta la rechazada.
  assert.deepEqual([...despues].sort(), antes.filter(id => id !== 'pizza-1').sort());
});

test('H23 en filtros y búsqueda la oferta rechazada sigue apareciendo', () => {
  const senales = [...INTERESES, rechazo('oferta', 'pizza-1')];
  for (const filtros of [{ categoria: 'Restaurantes' }, { comercio: 'piz' }, { hoy: false, comercio: 'PIZZA' }]) {
    assert.ok(ids(ordenar(senales, filtros)).includes('pizza-1'), JSON.stringify(filtros));
  }
});

test('H23 «Más de este comercio» da M = 1 y trae su categoría al alcance', () => {
  const respuesta = ordenar([interes('categoria', 'Entretenimiento'), interes('comercio', 'siman')]);
  assert.ok(ids(respuesta).includes('siman-1'));
  assert.equal(respuesta.promociones.find(o => o.id === 'siman-1').componentes.M, 1);
});

test('H23 «Menos» sobre un comercio no elegido multiplica su R por 0.3', () => {
  const sin = ordenar(INTERESES);
  const con = ordenar([...INTERESES, rechazo('comercio', 'pizza')]);
  assert.equal(R(sin, 'pizza-1'), 20);
  assert.equal(R(con, 'pizza-1'), 20 * 0.3);
  assert.equal(R(con, 'sushi-1'), 20);
  assert.ok(ids(con).indexOf('pizza-1') > ids(con).indexOf('sushi-1'));
});

test('H23 «Menos» sobre un comercio que estaba elegido solo pierde M: no se multiplica por 0.3', () => {
  // El handler desactiva el interés y guarda el rechazo con quitoEleccion; el registro solo entrega las activas.
  const respuesta = ordenar([...INTERESES, rechazo('comercio', 'pizza', { quitoEleccion: true })]);
  assert.deepEqual(respuesta.promociones.find(o => o.id === 'pizza-1').componentes, { C: 1, M: 0, T: 0, R: 20 });
});

test('H23 excluir categoría la saca de Para ti; un filtro explícito por ella la muestra en esa consulta', () => {
  const senales = [...INTERESES, rechazo('categoria', 'Restaurantes')];
  assert.deepEqual(ids(ordenar(senales)), ['cine-1']);
  assert.deepEqual(ids(ordenar(senales, { categoria: 'Restaurantes' })).sort(), ['pizza-1', 'pizza-2', 'sushi-1', 'tacos-1']);
  assert.equal(ids(ordenar(senales, { comercio: 'pizza' })).length, 0);
});

test('H23 una señal desactivada (deshecha) no tiene efecto: el orden vuelve a ser el anterior', () => {
  const antes = ids(ordenar(INTERESES));
  for (const deshecha of [rechazo('oferta', 'pizza-1'), rechazo('comercio', 'pizza'), rechazo('categoria', 'Restaurantes')]) {
    assert.deepEqual(ids(ordenar([...INTERESES, { ...deshecha, activa: false }])), antes, deshecha.ambito);
  }
});

test('H23 declarar «Menos» de un comercio elegido desactiva su interés y lo anota en el rechazo', () => {
  const elegido = interes('comercio', 'pizza');
  const efectos = efectosDeDeclarar({ clase: 'rechazo', ambito: 'comercio', valor: 'pizza' }, [elegido, interes('comercio', 'cine')]);
  assert.deepEqual(efectos, { desactivar: [elegido.id], quitoEleccion: true });
  assert.deepEqual(efectosDeDeclarar({ clase: 'rechazo', ambito: 'comercio', valor: 'sushi' }, [elegido]), { desactivar: [], quitoEleccion: false });
});

test('H23 declarar «Más» de un comercio retira su «Menos» activo; las demás señales no tienen efectos', () => {
  const menos = rechazo('comercio', 'pizza');
  assert.deepEqual(efectosDeDeclarar({ clase: 'interes', ambito: 'comercio', valor: 'pizza' }, [menos]), { desactivar: [menos.id], quitoEleccion: false });
  for (const nueva of [{ clase: 'rechazo', ambito: 'oferta', valor: 'pizza-1' }, { clase: 'rechazo', ambito: 'categoria', valor: 'Restaurantes' }]) {
    assert.deepEqual(efectosDeDeclarar(nueva, [menos, interes('comercio', 'pizza')]), { desactivar: [], quitoEleccion: false });
  }
});

test('H23 el estado de las correcciones de una oferta da el id de cada señal activa para deshacerla', () => {
  const noMe = rechazo('oferta', 'pizza-1');
  const mas = interes('comercio', 'pizza');
  const categoria = rechazo('categoria', 'Restaurantes');
  assert.deepEqual(estadoCorrecciones(OFERTAS[0], [noMe, mas, categoria, { ...rechazo('comercio', 'pizza'), activa: false }]),
    { noMeInteresa: noMe.id, mas: mas.id, menos: null, categoria: categoria.id });
  assert.deepEqual(estadoCorrecciones(OFERTAS[4], [noMe, mas, categoria]), { noMeInteresa: null, mas: null, menos: null, categoria: null });
});

const COMERCIOS = new Map(OFERTAS.map(o => [o.merchantId, o.category]));
const AHORA = new Date('2026-10-26T18:00:00Z');
const DIA = 24 * 60 * 60 * 1000;
const tresMenos = () => ['pizza', 'sushi', 'tacos'].map(valor => rechazo('comercio', valor));

test('H23 tras 3 «Menos» en comercios de una misma categoría se pregunta por ella', () => {
  assert.equal(preguntaPendiente(tresMenos().slice(0, 2), COMERCIOS, [], AHORA), null);
  assert.equal(preguntaPendiente(tresMenos(), COMERCIOS, [], AHORA), 'Restaurantes');
});

test('H23 «Menos» de categorías distintas o desactivados no suman al conteo', () => {
  const variados = ['pizza', 'cine', 'siman'].map(valor => rechazo('comercio', valor));
  assert.equal(preguntaPendiente(variados, COMERCIOS, [], AHORA), null);
  const [a, b, c] = tresMenos();
  assert.equal(preguntaPendiente([a, b, { ...c, activa: false }], COMERCIOS, [], AHORA), null);
});

test('H23 no se pregunta por una categoría ya excluida', () => {
  assert.equal(preguntaPendiente([...tresMenos(), rechazo('categoria', 'Restaurantes')], COMERCIOS, [], AHORA), null);
});

test('H23 si se rechaza la pregunta no vuelve en 30 días', () => {
  const respuesta = dias => ({ pregunta: 'excluir-categoria', valor: 'Restaurantes', respuesta: 'no', respondidaEn: new Date(AHORA - dias * DIA).toISOString() });
  assert.equal(preguntaPendiente(tresMenos(), COMERCIOS, [respuesta(29)], AHORA), null);
  assert.equal(preguntaPendiente(tresMenos(), COMERCIOS, [respuesta(30)], AHORA), 'Restaurantes');
  const otra = { ...respuesta(1), valor: 'Compras' };
  assert.equal(preguntaPendiente(tresMenos(), COMERCIOS, [otra], AHORA), 'Restaurantes');
});
