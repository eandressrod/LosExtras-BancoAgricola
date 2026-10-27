// H8: lógica de Cerca de ti y de la distancia del detalle. Todo se calcula en el navegador; la posición no sale de él.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RADIO_METROS, distanciaMetros, factorDistancia, puntajeCercania, sucursalMasCercana, resultadosCerca, textoDistancia
} from '../../public/js/cerca/cercania.js';
import { enlaceWaze, enlaceGoogleMaps } from '../../public/js/cerca/enlaces.js';
import { recorridoAproximado } from '../../public/js/cerca/recorrido.js';
import {
  OPCIONES_UBICACION, leerUbicacion, seguirUbicacion, guardarEleccion, leerEleccion, limpiarEleccion, origenDeZona
} from '../../public/js/cerca/origen.js';

const casi = (real, esperado, margen, mensaje) => assert.ok(Math.abs(real - esperado) <= margen, `${mensaje ?? ''} ${real} ≠ ${esperado}`);

// Origen fijo y sucursales a distancias conocidas hacia el norte (1° de latitud ≈ 111 195 m).
const ORIGEN = { latitud: 13.7, longitud: -89.2 };
const alNorte = metros => ({ latitud: 13.7 + metros / 111195, longitud: -89.2 });
const sucursal = (id, metros) => ({ id, name: id, address: '', zoneId: 'z', ...(({ latitud, longitud }) => ({ latitude: latitud, longitude: longitud }))(alNorte(metros)) });
const promo = (id, R, ...sucursales) => ({ id, componentes: { R }, branches: sucursales, canUse: true, availableToday: true });

test('distanciaMetros usa haversine: un grado de latitud mide unos 111 km', () => {
  casi(distanciaMetros({ latitud: 13, longitud: -89 }, { latitud: 14, longitud: -89 }), 111195, 1);
  assert.equal(distanciaMetros(ORIGEN, ORIGEN), 0);
  casi(distanciaMetros(ORIGEN, alNorte(1500)), 1500, 1);
});

test('factorDistancia D vale 1 hasta 500 m y baja lineal hasta 0.2 a 3 km', () => {
  assert.equal(RADIO_METROS, 3000);
  assert.equal(factorDistancia(0), 1);
  assert.equal(factorDistancia(500), 1);
  casi(factorDistancia(1750), 0.6, 1e-9);
  casi(factorDistancia(3000), 0.2, 1e-9);
  casi(factorDistancia(4000), 0.2, 1e-9, 'fuera del radio no baja de 0.2');
});

test('puntajeCercania es D × (0.2 + 0.8 × R / 95), con R acotado a 0–95', () => {
  assert.equal(puntajeCercania(400, 95), 1);
  casi(puntajeCercania(400, 0), 0.2, 1e-9);
  casi(puntajeCercania(3000, 0), 0.04, 1e-9);
  casi(puntajeCercania(1750, 47.5), 0.6 * 0.6, 1e-9);
  assert.equal(puntajeCercania(400, 200), 1);
  casi(puntajeCercania(400, -5), 0.2, 1e-9);
  casi(puntajeCercania(400, undefined), 0.2, 1e-9, 'sin puntaje del motor R = 0');
});

test('sucursalMasCercana elige la sucursal participante más cercana y null sin sucursales', () => {
  const cercana = sucursalMasCercana(promo('p', 0, sucursal('lejos', 2000), sucursal('cerca', 300)), ORIGEN);
  assert.equal(cercana.sucursal.id, 'cerca');
  casi(cercana.metros, 300, 1);
  assert.equal(sucursalMasCercana(promo('delivery', 0), ORIGEN), null);
  assert.equal(sucursalMasCercana({ id: 'sin-campo' }, ORIGEN), null);
});

test('resultadosCerca: arriba lo de 3 km o menos por puntaje, una vez por oferta con su sucursal más cercana', () => {
  const { cerca, lejos } = resultadosCerca([
    promo('cerca-r-bajo', 10, sucursal('a1', 200)),
    promo('media-r-alto', 95, sucursal('b1', 1200), sucursal('b2', 2500)),
    promo('lejos', 95, sucursal('c1', 3500)),
    promo('en-linea', 95)
  ], ORIGEN);
  assert.deepEqual(cerca.map(r => r.promocion.id), ['media-r-alto', 'cerca-r-bajo']);
  assert.equal(cerca[0].sucursal.id, 'b1');
  casi(cerca[0].metros, 1200, 1);
  assert.deepEqual(lejos.map(r => r.promocion.id), ['lejos'], 'lo que está más lejos no se pierde; lo que no tiene tienda no entra');
});

test('resultadosCerca: sin puntaje del motor queda en orden de distancia', () => {
  const { cerca } = resultadosCerca([
    promo('tercera', 0, sucursal('x', 2900)), promo('primera', 0, sucursal('y', 100)), promo('segunda', 0, sucursal('z', 450))
  ], ORIGEN);
  assert.deepEqual(cerca.map(r => r.promocion.id), ['primera', 'segunda', 'tercera']);
});

test('resultadosCerca: todo lo que está a más de 3 km va debajo, de la más cercana a la más lejana', () => {
  const ofertas = Array.from({ length: 7 }, (_, i) => promo(`p${i}`, 50, sucursal(`s${i}`, 9500 - i * 1000)));
  const { cerca, lejos } = resultadosCerca(ofertas, ORIGEN);
  assert.deepEqual(cerca, []);
  assert.deepEqual(lejos.map(r => r.promocion.id), ['p6', 'p5', 'p4', 'p3', 'p2', 'p1', 'p0']);
  assert.deepEqual(resultadosCerca([], ORIGEN), { cerca: [], lejos: [] });
});

test('resultadosCerca: Cerca de ti solo muestra lo que se puede usar ahora mismo', () => {
  const { cerca, lejos } = resultadosCerca([
    promo('hoy', 0, sucursal('h', 300)),
    { ...promo('otro-dia', 0, sucursal('o', 200)), availableToday: false },
    { ...promo('vencida', 0, sucursal('v', 100)), canUse: false },
    { ...promo('vencida-en-la-visita', 0, sucursal('w', 150)), vencida: true },
    { ...promo('lejos-otro-dia', 0, sucursal('l', 5000)), availableToday: false }
  ], ORIGEN);
  assert.deepEqual(cerca.map(r => r.promocion.id), ['hoy']);
  assert.deepEqual(lejos, []);
});

test('textoDistancia se indica aproximada y en kilómetros', () => {
  assert.equal(textoDistancia(1234), 'A 1.2 km aprox.');
  assert.equal(textoDistancia(40), 'A 0.1 km aprox.');
  assert.equal(textoDistancia(12600), 'A 12.6 km aprox.');
});

test('los enlaces llevan solo el destino, nunca la posición del usuario', () => {
  const destino = { latitud: 13.7055, longitud: -89.2099 };
  const waze = new URL(enlaceWaze(destino));
  assert.equal(waze.origin + waze.pathname, 'https://waze.com/ul');
  assert.deepEqual([...waze.searchParams.keys()], ['ll', 'navigate']);
  assert.equal(waze.searchParams.get('ll'), '13.7055,-89.2099');
  assert.equal(waze.searchParams.get('navigate'), 'yes');
  const google = new URL(enlaceGoogleMaps(destino));
  assert.equal(google.origin + google.pathname, 'https://www.google.com/maps/dir/');
  assert.deepEqual([...google.searchParams.keys()], ['api', 'destination']);
  assert.equal(google.searchParams.get('destination'), '13.7055,-89.2099');
});

test('recorridoAproximado une origen y destino con un codo, en orden [longitud, latitud]', () => {
  const destino = { latitud: 13.71, longitud: -89.21 };
  assert.deepEqual(recorridoAproximado(ORIGEN, destino), [[-89.2, 13.7], [-89.21, 13.7], [-89.21, 13.71]]);
});

function geolocalizacion({ posicion, error } = {}) {
  const llamadas = { lectura: [], seguimiento: [], detenidos: [] };
  return {
    llamadas,
    getCurrentPosition(exito, fallo, opciones) {
      llamadas.lectura.push(opciones);
      error ? fallo({ code: error }) : exito({ coords: { latitude: posicion.latitud, longitude: posicion.longitud, accuracy: 25 } });
    },
    watchPosition(exito, fallo, opciones) {
      llamadas.seguimiento.push(opciones);
      error ? fallo({ code: error }) : exito({ coords: { latitude: posicion.latitud, longitude: posicion.longitud, accuracy: 25 } });
      return 7;
    },
    clearWatch(id) { llamadas.detenidos.push(id); }
  };
}

test('leerUbicacion hace una lectura con tiempo límite y traduce los errores', async () => {
  assert.deepEqual(OPCIONES_UBICACION, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  const geo = geolocalizacion({ posicion: ORIGEN });
  assert.deepEqual(await leerUbicacion(geo), { ok: true, latitud: 13.7, longitud: -89.2 });
  assert.deepEqual(geo.llamadas.lectura, [OPCIONES_UBICACION]);
  assert.deepEqual(await leerUbicacion(geolocalizacion({ error: 1 })), { ok: false, motivo: 'denegada' });
  assert.deepEqual(await leerUbicacion(geolocalizacion({ error: 2 })), { ok: false, motivo: 'no-disponible' });
  assert.deepEqual(await leerUbicacion(geolocalizacion({ error: 3 })), { ok: false, motivo: 'tiempo' });
  assert.deepEqual(await leerUbicacion(undefined), { ok: false, motivo: 'no-disponible' });
});

test('seguirUbicacion usa watchPosition y su función de parada llama a clearWatch', () => {
  const geo = geolocalizacion({ posicion: ORIGEN });
  const vistas = [];
  const detener = seguirUbicacion(geo, posicion => vistas.push(posicion), () => assert.fail('sin error'));
  assert.deepEqual(vistas, [{ latitud: 13.7, longitud: -89.2 }]);
  detener();
  detener();
  assert.deepEqual(geo.llamadas.detenidos, [7]);
  let motivo;
  seguirUbicacion(geolocalizacion({ error: 1 }), () => assert.fail('sin posición'), m => { motivo = m; });
  assert.equal(motivo, 'denegada');
});

function almacen() {
  const datos = new Map();
  return { datos, getItem: k => datos.get(k) ?? null, setItem: (k, v) => datos.set(k, String(v)), removeItem: k => datos.delete(k) };
}

test('la elección guardada es del perfil, nunca incluye coordenadas y se limpia al cambiar de perfil', () => {
  const memoria = almacen();
  guardarEleccion(memoria, 'A', { tipo: 'ubicacion', latitud: 13.7, longitud: -89.2 });
  assert.doesNotMatch([...memoria.datos.values()].join(), /13\.7|89\.2/);
  assert.deepEqual(leerEleccion(memoria, 'A'), { tipo: 'ubicacion' });
  guardarEleccion(memoria, 'A', { tipo: 'zona', zonaId: 'escalon' });
  assert.deepEqual(leerEleccion(memoria, 'A'), { tipo: 'zona', zonaId: 'escalon' });
  assert.equal(leerEleccion(memoria, 'B'), null);
  assert.equal(memoria.datos.size, 0, 'otro perfil borra la elección anterior');
  guardarEleccion(memoria, 'A', { tipo: 'zona', zonaId: 'escalon' });
  limpiarEleccion(memoria);
  assert.equal(leerEleccion(memoria, 'A'), null);
  memoria.setItem('bancoagricola-cerca-origen', '{roto');
  assert.equal(leerEleccion(memoria, 'A'), null);
  assert.equal(leerEleccion({ getItem() { throw new Error('bloqueado'); }, removeItem() {} }, 'A'), null);
});

test('origenDeZona toma el centro de la zona elegida', () => {
  const zonas = [{ id: 'escalon', nombre: 'Escalón', latitud: 13.7036, longitud: -89.2418 }];
  assert.deepEqual(origenDeZona(zonas, 'escalon'), { tipo: 'zona', zonaId: 'escalon', nombre: 'Escalón', latitud: 13.7036, longitud: -89.2418 });
  assert.equal(origenDeZona(zonas, 'otra'), null);
});

test('la zona guardada es la señal activa criterio·zona; al elegir otra se desactivan las anteriores', async () => {
  const { zonaDeSenales, senalesZonaPorQuitar, SENAL_ZONA } = await import('../../public/js/cerca/zona.js');
  const senales = [
    { id: 1, clase: 'interes', ambito: 'comercio', valor: 'cine' },
    { id: 2, clase: 'criterio', ambito: 'zona', valor: 'escalon' },
    { id: 3, clase: 'criterio', ambito: 'canal', valor: 'presencial' }
  ];
  assert.equal(zonaDeSenales(senales), 'escalon');
  assert.equal(zonaDeSenales([]), null);
  assert.equal(zonaDeSenales(undefined), null);
  assert.deepEqual(senalesZonaPorQuitar(senales, 'santa-tecla'), [2]);
  assert.deepEqual(senalesZonaPorQuitar(senales, 'escalon'), []);
  assert.deepEqual(SENAL_ZONA('santa-tecla'), { clase: 'criterio', ambito: 'zona', valor: 'santa-tecla', origen: 'pregunta' });
});

test('permisoConcedido solo confirma un permiso ya concedido; ante la duda no pide la ubicación al abrir', async () => {
  const { permisoConcedido } = await import('../../public/js/cerca/origen.js');
  const permisos = estado => ({ query: async ({ name }) => { assert.equal(name, 'geolocation'); return { state: estado }; } });
  assert.equal(await permisoConcedido(permisos('granted')), true);
  assert.equal(await permisoConcedido(permisos('prompt')), false);
  assert.equal(await permisoConcedido(permisos('denied')), false);
  assert.equal(await permisoConcedido({ query: async () => { throw new Error('no soportado'); } }), false);
  assert.equal(await permisoConcedido(undefined), false);
});

test('botonesOrigen: con la ubicación activa se ofrece seguirla en vez de volver a pedirla', async () => {
  const { botonesOrigen } = await import('../../public/js/cerca/origen.js');
  assert.deepEqual(botonesOrigen(null, true), { zona: false, ubicacion: true, seguir: false, pregunta: true });
  assert.deepEqual(botonesOrigen(null, false), { zona: true, ubicacion: true, seguir: false, pregunta: false });
  assert.deepEqual(botonesOrigen({ tipo: 'zona', zonaId: 'escalon' }, true), { zona: true, ubicacion: true, seguir: false, pregunta: false });
  assert.deepEqual(botonesOrigen({ tipo: 'ubicacion' }, true), { zona: true, ubicacion: false, seguir: true, pregunta: false });
});

test('urlMotor vuelve a pedir el motor con otra URL al reintentar: el navegador recuerda una importación fallida', async () => {
  const { urlMotor } = await import('../../public/js/cerca/mapa.js');
  assert.equal(urlMotor(0), '/vendor/maplibre-gl@6.16.0/maplibre-gl.mjs');
  assert.equal(urlMotor(2), '/vendor/maplibre-gl@6.16.0/maplibre-gl.mjs?intento=2');
  assert.notEqual(urlMotor(1), urlMotor(2));
});

test('colocacionGlobo deja el pin sobre la atribución y el globo completo dentro del mapa', async () => {
  const { colocacionGlobo } = await import('../../public/js/cerca/mapa.js');
  // Sobre el pin: separación (44) y punta (10); el globo suma su relleno (12 arriba y 12 abajo) al alto del contenido.
  for (const alto of [220, 304, 313, 380, 813]) {
    const { desplazamiento: [x, y], altoMaximo } = colocacionGlobo(alto);
    const pin = alto / 2 + y;
    assert.equal(x, 0);
    assert.ok(pin <= alto - 56, `${alto}: el pin queda sobre la atribución`);
    assert.ok(altoMaximo >= 120, `${alto}: el globo conserva un alto útil`);
    if (alto >= 300) assert.ok(pin - 44 - 10 - 24 - altoMaximo >= 12, `${alto}: el globo cabe arriba del pin`);
  }
  assert.deepEqual(colocacionGlobo(0).desplazamiento, [0, 0]);
});

test('encuadrar acepta márgenes por lado para no esconder puntos bajo los controles del mapa', async () => {
  const { encuadrar } = await import('../../public/js/cerca/mapa.js');
  const llamadas = [];
  const mapa = { fitBounds: (limites, opciones) => llamadas.push({ limites, opciones }) };
  const anterior = globalThis.matchMedia;
  globalThis.matchMedia = () => ({ matches: false });
  try {
    const margen = { top: 80, right: 56, bottom: 56, left: 56 };
    encuadrar(mapa, [ORIGEN, alNorte(1000)], { margen, zoom: 15, animar: false });
    assert.deepEqual(llamadas[0].opciones.padding, margen);
    encuadrar(mapa, [ORIGEN, alNorte(1000)], { margen: 40 });
    assert.equal(llamadas[1].opciones.padding, 40);
  } finally { globalThis.matchMedia = anterior; }
});

test('controlarAtras: el «atrás» del sistema cierra el mapa ampliado sin salir de la página', async () => {
  const { controlarAtras } = await import('../../public/js/cerca/atras.js');
  const historial = { state: { perfil: 'A' }, entradas: 0, atras: 0, pushState(estado) { this.state = estado; this.entradas += 1; }, back() { this.atras += 1; } };
  let cerrado = 0;
  const atras = controlarAtras(historial, () => { cerrado += 1; });
  assert.equal(atras.alNavegar(), false, 'sin mapa ampliado, «atrás» sigue su curso');
  atras.abrir();
  atras.abrir();
  assert.equal(historial.entradas, 1, 'una sola entrada por apertura');
  assert.deepEqual(historial.state, { perfil: 'A', mapaAmpliado: true }, 'conserva el estado de la página');
  assert.equal(atras.alNavegar(), true);
  assert.equal(cerrado, 1, '«atrás» cierra el mapa');
  assert.equal(historial.atras, 0, 'el sistema ya retrocedió');
  atras.abrir();
  atras.cerrar();
  assert.equal(historial.atras, 1, 'cerrar con el botón deshace la entrada añadida');
  assert.equal(atras.alNavegar(), false, 'el retroceso propio no vuelve a cerrar');
  assert.equal(cerrado, 1);
  atras.cerrar();
  assert.equal(historial.atras, 1, 'cerrar sin mapa ampliado no retrocede');
});
