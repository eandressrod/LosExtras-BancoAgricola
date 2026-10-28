// H25 (SCRUM-17 / SCRUM-118): pruebas unitarias y de integración del término T («Hoy busco»).
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fuente from '../../catalogo/catalogo.json' with { type: 'json' };
import { CONFIGURACION } from '../../public/js/motor/config.js';
import {
  ordenarParaTi,
  CHIPS_HOY_BUSCO,
  calcularTerminoIntencion,
  reglaIntencion,
  textoPrimeroHoyBusco
} from '../../public/js/motor/index.js';
import { PERFILES, ofertasDelCatalogo } from '../fixtures/motor/perfiles.js';
import { crearHandlerParaTi } from '../../backend/handlers/para-ti.js';
import { reiniciarSenalesMock } from '../../backend/repositorios/senales.mock.js';
import { crearToken } from '../../backend/servicios/sesion.js';
import recursos from '../../api/recursos.js';

process.env.DATA_SOURCE = 'mock';
process.env.SESSION_SECRET = 'h25-hoy-busco-pruebas'.repeat(3);

const AHORA = new Date('2026-10-21T18:00:00Z');
const paraTi = crearHandlerParaTi(undefined, () => AHORA);
const pedir = (ruta, perfilId, opciones = {}) => new Request('http://localhost' + ruta, {
  ...opciones, headers: { ...(perfilId && { cookie: `sesion_extras=${crearToken(perfilId)}` }), ...opciones.headers }
});

beforeEach(() => reiniciarSenalesMock());

test('H25 el vocabulario de chips Hoy busco contiene las 11 ocasiones en orden más la etiqueta Regalo del catálogo', () => {
  const ocasionesEsperadas = [...fuente.ocasiones].sort((a, b) => a.orden - b.orden).map(o => ({ id: o.id, nombre: o.nombre, tipo: 'ocasion' }));
  const etiquetasEsperadas = fuente.etiquetasIntencion.map(e => ({ id: e.id, nombre: e.nombre, tipo: 'etiqueta' }));
  assert.deepEqual(CHIPS_HOY_BUSCO.map(({ id, nombre, tipo }) => ({ id, nombre, tipo })), [...ocasionesEsperadas, ...etiquetasEsperadas]);
  // La palabra visible del chip forma parte de su nombre accesible (comentario 10035 de SCRUM-118).
  for (const chip of CHIPS_HOY_BUSCO) assert.ok(chip.nombre.toLowerCase().includes(chip.corto.toLowerCase()), chip.id);
  assert.equal(textoPrimeroHoyBusco('salir'), 'Primero: salir con amigos o pareja');
  assert.equal(textoPrimeroHoyBusco('regalo'), 'Primero: regalo');
  assert.equal(textoPrimeroHoyBusco(null), '');
});

test('H25 cálculo de T por ocasión (umbral versionado: solo ocasiones en torno a las que gira la oferta) y por etiqueta', () => {
  // Desde 2026-10-26.1 el umbral es 1: un 0.5 («la incluye en parte») ya no sube la oferta (Pizza Hut en Entretenimiento).
  assert.equal(CONFIGURACION.umbralOcasion, 1);
  const promo = {
    id: 'p1',
    occasions: { salir: 1, familia: 0.5, viajes: 0 },
    intentTags: ['regalo']
  };
  // Coincidencia por ocasión = 1; un 0.5 no basta
  assert.equal(calcularTerminoIntencion(promo, 'salir'), 1);
  assert.equal(calcularTerminoIntencion(promo, 'familia'), 0);
  assert.equal(calcularTerminoIntencion(promo, 'viajes'), 0);
  assert.equal(calcularTerminoIntencion(promo, 'hogar'), 0);
  // Respeta un umbral distinto en la configuración versionada
  const configAmplia = { ...CONFIGURACION, umbralOcasion: 0.5 };
  assert.equal(calcularTerminoIntencion(promo, 'familia', configAmplia), 1);
  assert.equal(calcularTerminoIntencion(promo, 'salir', configAmplia), 1);
  // Coincidencia por etiqueta de intención («regalo»)
  assert.equal(calcularTerminoIntencion(promo, 'regalo'), 1);
  assert.equal(calcularTerminoIntencion({ id: 'p2', occasions: {}, intentTags: [] }, 'regalo'), 0);
  // Sin chip activo, T = 0
  assert.equal(calcularTerminoIntencion(promo, null), 0);
});

test('H25 T suma 15·T y reordena sin filtrar ninguna promoción elegible del alcance', () => {
  const ofertas = ofertasDelCatalogo('basica');
  const senales = PERFILES.soloCategorias;
  const sinChip = ordenarParaTi({ ofertas, senales });
  // «Rápido» tiene ocasiones en 1 dentro del alcance (Restaurantes); con el umbral 1, «Salir» solo coincide con el cine.
  const conChip = ordenarParaTi({ ofertas, senales, reglas: { intencion: reglaIntencion('rapido-practico') } });

  // No filtra: exactamente el mismo conjunto de promociones
  assert.deepEqual(
    conChip.promociones.map(p => p.id).sort(),
    sinChip.promociones.map(p => p.id).sort()
  );

  // R suma 15·T en las que coinciden y las coloca primero dentro de su mismo nivel de comercio/categoría
  for (const promo of conChip.promociones) {
    const base = sinChip.promociones.find(p => p.id === promo.id);
    const esperadoT = calcularTerminoIntencion(promo, 'rapido-practico');
    assert.equal(promo.componentes.T, esperadoT, promo.id);
    assert.equal(promo.componentes.R, base.componentes.R + 15 * esperadoT, promo.id);
  }
  assert.equal(conChip.promociones[0].componentes.T, 1);
});

test('H25 un comercio no elegido nunca supera a uno elegido con la misma T', () => {
  const chips = CHIPS_HOY_BUSCO.map(c => c.id);
  for (const tarjeta of ['basica', 'black']) {
    const ofertas = ofertasDelCatalogo(tarjeta);
    for (const chip of chips) {
      const { promociones } = ordenarParaTi({
        ofertas,
        senales: PERFILES.conComercios,
        reglas: { intencion: reglaIntencion(chip) }
      });
      for (const valorT of [0, 1]) {
        const elegidos = promociones.filter(o => o.componentes.M === 1 && o.componentes.T === valorT).map(o => o.componentes.R);
        const noElegidos = promociones.filter(o => o.componentes.M === 0 && o.componentes.T === valorT).map(o => o.componentes.R);
        if (elegidos.length && noElegidos.length) {
          assert.ok(Math.min(...elegidos) > Math.max(...noElegidos), `${tarjeta} · ${chip} · T=${valorT}`);
        }
      }
      // Además, ningún comercio no elegido supera en R ni en la primera posición a uno elegido
      assert.equal(promociones[0].componentes.M, 1, `${tarjeta} · ${chip}`);
    }
  }
});

test('H25 cuando T es el término dominante la razón es «Por lo que buscas hoy»', () => {
  const ofertas = ofertasDelCatalogo('basica');
  // Con perfil sin intereses y chip de regalo activo, T = 1 y es dominante
  const conRegaloSinIntereses = ordenarParaTi({
    ofertas,
    senales: PERFILES.vacio,
    reglas: { intencion: reglaIntencion('regalo') }
  });
  const primerasRegalo = conRegaloSinIntereses.promociones.filter(p => p.componentes.T === 1);
  assert.ok(primerasRegalo.length > 0);
  assert.equal(conRegaloSinIntereses.promociones[0].componentes.T, 1);
  for (const promo of primerasRegalo) {
    assert.deepEqual(promo.razon, { tipo: 'intencion', texto: 'Por lo que buscas hoy' });
  }
});

test('H25 GET /api/para-ti acepta ?intencion= válida, reordena sin crear señales y rechaza valores inválidos con 400', async () => {
  const resInvalida = await paraTi.fetch(pedir('/api/para-ti?intencion=inexistente', 'A'));
  assert.equal(resInvalida.status, 400);

  const resRepetida = await paraTi.fetch(pedir('/api/para-ti?intencion=salir&intencion=regalo', 'A'));
  assert.equal(resRepetida.status, 400);

  const resRegalo = await paraTi.fetch(pedir('/api/para-ti?intencion=regalo', 'A'));
  assert.equal(resRegalo.status, 200);
  const cuerpo = await resRegalo.json();
  assert.equal(cuerpo.promociones[0].componentes.T, 1);
  assert.deepEqual(cuerpo.promociones[0].razon, { tipo: 'intencion', texto: 'Por lo que buscas hoy' });

  // No crea señales ni modifica el perfil
  const senales = await (await recursos.fetch(pedir('/api/senales', 'A'))).json();
  assert.deepEqual(senales.senales, []);
});