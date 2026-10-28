// H8: pantalla Cerca de ti. La posición del dispositivo vive solo en memoria; la zona elegida se guarda como señal.
// El mapa es un complemento: si no carga, la lista sigue funcionando (CDA 10).
import { getJSON, almacenSesion, readStorage, saveStorage } from '../comun.js';
import { resultadosCerca, textoDistancia, distanciaMetros } from './cercania.js';
import {
  leerUbicacion, seguirUbicacion, guardarEleccion, leerEleccion, origenDeZona, permisoConcedido, botonesOrigen, CLAVE_VISTA
} from './origen.js';
import { cargarZonas, leerZonaGuardada, guardarZona } from './zona.js';
import { crearMapa, crearMarcador, encuadrar, precargarMotor, colocacionGlobo, SEPARACION_GLOBO } from './mapa.js';
import { controlarAtras } from './atras.js';

const CENTRO_INICIAL = { latitud: 13.6989, longitud: -89.2190 }; // Área metropolitana de San Salvador.
const MOVIMIENTO_MINIMO_METROS = 30;
// Arriba se reserva el botón «Ampliar mapa» para que no tape el origen ni las sucursales.
const MARGEN_ENCUADRE = { top: 84, right: 56, bottom: 56, left: 56 };
const MOTIVOS = {
  denegada: 'No diste permiso para usar tu ubicación. Elige una zona.',
  'no-disponible': 'No se pudo obtener tu ubicación. Elige una zona.',
  tiempo: 'Tu ubicación tardó demasiado. Elige una zona.'
};

const posicionDe = sucursal => ({ latitud: sucursal.latitude, longitud: sucursal.longitude });
const elemento = (etiqueta, clase, texto) => {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
};

/**
 * @param {{ perfil: {id: string}, consulta: () => string, urlDetalle: (id: string) => string, enfocarSucursal?: string | null }} opciones
 *   consulta: URL de /api/para-ti con los filtros de la visita; enfocarSucursal: abrir centrado en esa sucursal (desde el detalle).
 */
export function crearCerca({ perfil, consulta, urlDetalle, enfocarSucursal = null }) {
  const $ = selector => document.querySelector(selector);
  const textoOrigen = $('#cerca-origen');
  const botonZona = $('#cerca-zona');
  const botonUbicacion = $('#cerca-ubicacion');
  const botonSeguir = $('#cerca-seguir');
  const pregunta = $('#cerca-pregunta');
  const contenedorMapa = $('#mapa-cerca');
  const rotuloMapa = contenedorMapa.querySelector('.pr-mapa__rotulo');
  const botonAmpliar = $('#cerca-ampliar');
  const conteo = $('#cerca-conteo');
  const estado = $('#cerca-estado');
  const reintentar = $('#cerca-reintentar');
  const lista = $('#cerca-lista');
  const hojaZonas = $('#zonas');
  const sesion = almacenSesion();

  let zonas = [];
  let origen = null;
  let promociones = null;
  let consultaCargada = null;
  let resultado = { cerca: [], lejos: [] };
  // Las dos secciones seguidas: primero lo de 3 km o menos y luego lo que está más lejos.
  const todos = () => [...resultado.cerca, ...resultado.lejos];
  let preparacion = null;
  let visible = false;
  let ml = null;
  let mapa = null;
  let cargandoMapa = null;
  let marcadores = [];
  let marcadorOrigen = null;
  let globo = null;
  let detenerSeguimiento = null;
  const vista = leerVista();
  let seleccion = enfocarSucursal ?? vista?.seleccion ?? null;

  // Vista del mapa para volver del detalle. El centro solo se guarda si no delata la posición del dispositivo.
  function leerVista() {
    try {
      const guardada = JSON.parse(readStorage(sesion, CLAVE_VISTA));
      return guardada?.perfilId === perfil.id ? guardada : null;
    } catch { return null; }
  }
  function guardarVista() {
    if (!mapa || !sesion) return;
    const centro = mapa.getCenter();
    const conCentro = origen?.tipo === 'zona' || Boolean(seleccion);
    saveStorage(sesion, CLAVE_VISTA, JSON.stringify({
      perfilId: perfil.id, zoom: mapa.getZoom(), seleccion,
      ...(conCentro && { centro: { latitud: centro.lat, longitud: centro.lng } })
    }));
  }

  // Origen visible en la pantalla: «Cerca de tu ubicación» o «Cerca de <zona>».
  function pintarOrigen() {
    textoOrigen.textContent = !origen ? 'Elige una zona o usa tu ubicación para ver lo que hay cerca.'
      : origen.tipo === 'ubicacion' ? 'Cerca de tu ubicación' : `Cerca de ${origen.nombre}`;
    const visibles = botonesOrigen(origen, zonas.length > 0);
    botonZona.hidden = !visibles.zona;
    botonZona.textContent = 'Cambiar zona';
    botonUbicacion.hidden = !visibles.ubicacion;
    botonSeguir.hidden = !visibles.seguir;
    pregunta.hidden = !visibles.pregunta;
    for (const chip of document.querySelectorAll('.pr-zonas .filter-chip')) {
      chip.setAttribute('aria-pressed', String(origen?.tipo === 'zona' && chip.dataset.zona === origen.zonaId));
    }
  }

  function pintarZonas() {
    for (const grupo of document.querySelectorAll('.pr-zonas')) {
      grupo.replaceChildren(...zonas.map(zona => {
        const chip = elemento('button', 'filter-chip', zona.nombre);
        chip.type = 'button';
        chip.dataset.zona = zona.id;
        chip.setAttribute('aria-pressed', 'false');
        chip.addEventListener('click', () => elegirZona(zona.id));
        return chip;
      }));
    }
  }

  // 'aviso': línea discreta sobre la lista; 'vacio' y 'error': tarjeta de estado (la de error con «Reintentar»).
  function ponerEstado(texto, tipo = 'aviso') {
    conteo.textContent = tipo === 'aviso' ? texto : '';
    estado.textContent = tipo === 'aviso' ? '' : texto;
    estado.className = tipo === 'error' ? 'error' : 'note';
    reintentar.hidden = tipo !== 'error';
  }

  // Ofertas aplicables de una sucursal: todas las de la consulta en las que participa.
  function ofertasDe(sucursalId) {
    return (promociones ?? []).filter(promocion => promocion.branches?.some(sucursal => sucursal.id === sucursalId));
  }
  function sucursalPorId(id) {
    for (const promocion of promociones ?? []) {
      const sucursal = promocion.branches?.find(item => item.id === id);
      if (sucursal) return sucursal;
    }
    return null;
  }

  function calcular() {
    resultado = origen && promociones ? resultadosCerca(promociones, origen) : { cerca: [], lejos: [] };
    pintarLista();
    pintarMarcadores();
  }

  function pintarLista() {
    if (!promociones) return;
    const { cerca, lejos } = resultado;
    lista.replaceChildren(
      ...(cerca.length ? [encabezado('A 3 km o menos', cerca.length), ...cerca.map(crearElemento)] : []),
      ...(lejos.length ? [encabezado('Más lejos', lejos.length), ...lejos.map(crearElemento)] : [])
    );
    if (!origen) return ponerEstado('');
    if (!cerca.length && !lejos.length) return ponerEstado('Hoy no hay promociones en tienda para tus tarjetas.', 'vacio');
    if (!cerca.length) return ponerEstado('No hay comercios con tus promociones a 3 km o menos. Estos son los más cercanos.');
    const total = cerca.length + lejos.length;
    ponerEstado(total === 1 ? '1 promoción para usar hoy' : `${total} promociones para usar hoy`);
  }

  // Encabezado de sección dentro de la lista; no es un comercio, así que no lleva acciones.
  function encabezado(texto, cuantas) {
    const item = elemento('li', 'pr-cerca__seccion');
    item.setAttribute('role', 'presentation');
    const titulo = elemento('h3', 'pr-cerca__seccion-titulo', texto);
    titulo.append(elemento('span', 'pr-cerca__seccion-cuenta', String(cuantas)));
    item.append(titulo);
    return item;
  }

  function crearElemento({ promocion, sucursal, metros }) {
    const item = elemento('li', 'pr-cerca__item');
    item.dataset.sucursal = sucursal.id;
    const elegir = elemento('button', 'pr-cerca__elegir');
    elegir.type = 'button';
    const logo = elemento('img', 'pr-cerca__logo');
    logo.alt = '';
    logo.loading = 'lazy';
    if (promocion.logoUrl) logo.src = promocion.logoUrl;
    const textos = elemento('span', 'pr-cerca__textos');
    textos.append(
      elemento('span', 'pr-cerca__comercio', promocion.merchant),
      elemento('span', 'pr-cerca__beneficio', promocion.benefit),
      elemento('span', 'pr-cerca__sucursal', `${sucursal.name} · ${textoDistancia(metros)}`)
    );
    elegir.append(logo, textos);
    elegir.addEventListener('click', () => {
      seleccionar(sucursal.id);
      contenedorMapa.scrollIntoView?.({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    const ver = elemento('a', 'pr-cerca__ver', 'Ver promoción');
    ver.href = urlDetalle(promocion.id);
    ver.addEventListener('click', guardarVista);
    item.append(elegir, ver);
    return item;
  }

  // Marcadores: uno por sucursal de la lista (o todas, si aún no hay origen) y la sucursal enfocada desde el detalle.
  function pintarMarcadores() {
    if (!mapa) return;
    for (const marcador of marcadores) marcador.remove();
    marcadores = [];
    const sucursales = new Map();
    const fuente = origen ? todos().map(r => r.sucursal) : (promociones ?? []).flatMap(p => p.branches ?? []);
    for (const sucursal of fuente) sucursales.set(sucursal.id, sucursal);
    const enfocada = seleccion && sucursalPorId(seleccion);
    if (enfocada) sucursales.set(enfocada.id, enfocada);
    for (const sucursal of sucursales.values()) {
      const cuantas = ofertasDe(sucursal.id).length;
      marcadores.push(crearMarcador(ml, {
        posicion: posicionDe(sucursal), clase: 'pr-marcador--sucursal',
        etiqueta: `${sucursal.name}: ${cuantas === 1 ? '1 promoción' : cuantas + ' promociones'}`,
        alTocar: () => seleccionar(sucursal.id)
      }).addTo(mapa));
    }
    marcadorOrigen?.remove();
    marcadorOrigen = origen ? crearMarcador(ml, { posicion: origen, clase: 'pr-marcador--origen' }).addTo(mapa) : null;
  }

  // Tocar un marcador o un elemento de la lista muestra el comercio y sus promociones aplicables.
  function seleccionar(sucursalId) {
    seleccion = sucursalId;
    for (const item of lista.children) {
      if (item.dataset.sucursal === sucursalId) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    }
    const sucursal = sucursalPorId(sucursalId);
    if (!mapa || !sucursal) return;
    globo?.remove();
    const contenido = elemento('div', 'pr-globo');
    contenido.append(elemento('h3', 'pr-globo__titulo', sucursal.name), elemento('p', 'pr-globo__direccion', sucursal.address));
    const ofertas = elemento('ul', 'pr-globo__ofertas');
    for (const promocion of ofertasDe(sucursalId)) {
      const fila = elemento('li');
      const ver = elemento('a', 'pr-globo__ver', 'Ver promoción');
      ver.href = urlDetalle(promocion.id);
      ver.addEventListener('click', evento => {
        guardarVista();
        // Desde el mapa ampliado, el detalle ocupa la entrada que añadió el mapa: «atrás» vuelve directo a la lista.
        if (ampliado()) {
          evento.preventDefault();
          location.replace(ver.href);
        }
      });
      fila.append(elemento('span', 'pr-globo__beneficio', promocion.benefit), ver);
      ofertas.append(fila);
    }
    contenido.append(ofertas);
    // El globo siempre va sobre el pin, y el pin baja lo necesario para que el globo quepa completo.
    const { desplazamiento, altoMaximo } = colocacionGlobo(contenedorMapa.clientHeight);
    contenido.style.maxHeight = `${altoMaximo}px`;
    globo = new ml.Popup({ anchor: 'bottom', offset: SEPARACION_GLOBO, maxWidth: '280px', focusAfterOpen: false })
      .setLngLat([sucursal.longitude, sucursal.latitude]).setDOMContent(contenido).addTo(mapa);
    globo.on('close', () => { if (seleccion === sucursalId) seleccion = null; });
    mapa.easeTo({
      center: [sucursal.longitude, sucursal.latitude], offset: desplazamiento,
      duration: matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 400
    });
    guardarVista();
  }

  function encuadrarOrigen(animar = true) {
    if (!mapa || !origen) return;
    const cercanas = todos().slice(0, 5).map(r => posicionDe(r.sucursal));
    encuadrar(mapa, [origen, ...cercanas], { margen: MARGEN_ENCUADRE, zoom: 15, animar });
  }

  async function montarMapa() {
    if (mapa || cargandoMapa) return cargandoMapa;
    contenedorMapa.classList.remove('pr-mapa--error');
    rotuloMapa.textContent = 'Cargando mapa…';
    contenedorMapa.querySelector('.pr-mapa__reintentar')?.remove();
    const inicial = vista?.centro ?? origen ?? CENTRO_INICIAL;
    cargandoMapa = crearMapa(contenedorMapa, { centro: inicial, zoom: vista?.zoom ?? (origen ? 14 : 11) })
      .then(creado => {
        ({ ml, mapa } = creado);
        contenedorMapa.classList.add('pr-mapa--activo');
        mapa.resize(); // El contenedor cambia de alto al activarse; sin esto el encuadre usa el alto anterior.
        botonAmpliar.hidden = false;
        mapa.on('moveend', guardarVista);
        pintarMarcadores();
        if (seleccion && sucursalPorId(seleccion)) seleccionar(seleccion);
        else if (!vista?.centro) encuadrarOrigen(false);
      })
      .catch(() => {
        contenedorMapa.classList.add('pr-mapa--error');
        rotuloMapa.textContent = 'No se pudo cargar el mapa. La lista sigue disponible.';
        const otraVez = elemento('button', 'pr-mapa__reintentar secondary', 'Reintentar mapa');
        otraVez.type = 'button';
        otraVez.addEventListener('click', montarMapa);
        rotuloMapa.after(otraVez);
      })
      .finally(() => { cargandoMapa = null; });
    return cargandoMapa;
  }

  async function cargarPromociones() {
    const url = consulta();
    if (promociones && url === consultaCargada) return;
    ponerEstado('Buscando promociones cerca…');
    lista.replaceChildren();
    try {
      const respuesta = await getJSON(url);
      promociones = (respuesta.promociones ?? []).filter(promocion => !promocion.expired);
      consultaCargada = url;
    } catch (error) {
      promociones = null;
      ponerEstado(error.message, 'error');
      throw error;
    }
  }

  // Origen al abrir: la elección de esta visita o la zona guardada. Nunca se pide la ubicación sin que la persona la elija.
  // zonaGuardada: la lectura de la zona guardada, ya en curso si no hay elección de esta visita.
  async function resolverOrigen(eleccion, zonaGuardada) {
    if (eleccion?.tipo === 'zona') return origenDeZona(zonas, eleccion.zonaId);
    if (eleccion?.tipo === 'ubicacion' && await permisoConcedido(navigator.permissions)) {
      const lectura = await leerUbicacion(navigator.geolocation);
      if (lectura.ok) return { tipo: 'ubicacion', latitud: lectura.latitud, longitud: lectura.longitud };
    }
    const guardada = await (zonaGuardada ?? leerZonaGuardada());
    return guardada ? origenDeZona(zonas, guardada) : null;
  }

  async function preparar() {
    try {
      // La zona guardada se pide junto con zonas y promociones, no después.
      const eleccion = leerEleccion(sesion, perfil.id);
      const zonaGuardada = eleccion ? null : leerZonaGuardada();
      zonaGuardada?.catch(() => { /* El error se atiende al esperarla. */ });
      [zonas] = await Promise.all([cargarZonas(), cargarPromociones()]);
      pintarZonas();
      origen = await resolverOrigen(eleccion, zonaGuardada);
      pintarOrigen();
      calcular();
    } catch (error) {
      preparacion = null; // «Reintentar» vuelve a empezar.
      ponerEstado(error.message, 'error');
      return;
    }
    if (visible) montarMapa();
  }

  async function elegirZona(zonaId) {
    const elegido = origenDeZona(zonas, zonaId);
    if (!elegido) return;
    detener();
    origen = elegido;
    guardarEleccion(sesion, perfil.id, { tipo: 'zona', zonaId });
    if (hojaZonas.open) hojaZonas.close();
    seleccion = null;
    globo?.remove();
    pintarOrigen();
    calcular();
    encuadrarOrigen();
    guardarVista();
    guardarZona(zonaId);
  }

  async function usarUbicacion() {
    botonUbicacion.disabled = true;
    ponerEstado('Buscando tu ubicación…');
    const lectura = await leerUbicacion(navigator.geolocation);
    botonUbicacion.disabled = false;
    if (!lectura.ok) {
      // Sin permiso o sin lectura, la posición anterior ya no vale: se vuelve a la zona.
      if (origen?.tipo === 'ubicacion') {
        detener();
        origen = null;
        pintarOrigen();
        calcular();
      } else {
        pintarLista();
      }
      ponerEstado(MOTIVOS[lectura.motivo]);
      return;
    }
    origen = { tipo: 'ubicacion', latitud: lectura.latitud, longitud: lectura.longitud };
    guardarEleccion(sesion, perfil.id, { tipo: 'ubicacion' });
    seleccion = null;
    globo?.remove();
    pintarOrigen();
    calcular();
    encuadrarOrigen();
    guardarVista(); // Sin centro: con la ubicación, la cámara no se guarda donde está la persona.
  }

  // «Seguir mi ubicación»: watchPosition solo mientras la pantalla está visible.
  function alternarSeguimiento() {
    if (detenerSeguimiento) return detener();
    botonSeguir.setAttribute('aria-pressed', 'true');
    detenerSeguimiento = seguirUbicacion(navigator.geolocation, posicion => {
      if (origen && distanciaMetros(origen, posicion) < MOVIMIENTO_MINIMO_METROS) return;
      origen = { tipo: 'ubicacion', ...posicion };
      calcular();
      mapa?.easeTo({ center: [posicion.longitud, posicion.latitud] });
    }, motivo => {
      detener();
      ponerEstado(MOTIVOS[motivo]);
    });
  }
  function detener() {
    detenerSeguimiento?.();
    detenerSeguimiento = null;
    botonSeguir.setAttribute('aria-pressed', 'false');
  }

  // Mapa a pantalla completa con un botón para volver; Esc y el «atrás» del sistema también vuelven.
  const atras = controlarAtras(history, () => ampliar(false));
  const ampliado = () => contenedorMapa.classList.contains('pr-mapa--ampliado');
  function ampliar(activar) {
    contenedorMapa.classList.toggle('pr-mapa--ampliado', activar);
    document.body.classList.toggle('pr-mapa-abierto', activar);
    botonAmpliar.setAttribute('aria-pressed', String(activar));
    botonAmpliar.textContent = activar ? 'Cerrar mapa' : 'Ampliar mapa';
    mapa?.resize();
  }
  function cerrarAmpliado() {
    if (!ampliado()) return;
    ampliar(false);
    atras.cerrar();
  }

  botonZona.addEventListener('click', () => hojaZonas.showModal());
  $('#cerrar-zonas').addEventListener('click', () => hojaZonas.close());
  botonUbicacion.addEventListener('click', usarUbicacion);
  botonSeguir.addEventListener('click', alternarSeguimiento);
  botonAmpliar.addEventListener('click', () => {
    if (ampliado()) return cerrarAmpliado();
    ampliar(true);
    atras.abrir();
  });
  document.addEventListener('keydown', evento => { if (evento.key === 'Escape') cerrarAmpliado(); });
  addEventListener('popstate', () => atras.alNavegar());
  reintentar.addEventListener('click', () => mostrar());
  document.addEventListener('visibilitychange', () => { if (document.hidden) detener(); });
  addEventListener('pagehide', detener);

  function mostrar() {
    visible = true;
    precargarMotor();
    preparacion ??= preparar();
    return preparacion.then(async () => {
      if (!visible || !zonas.length) return;
      if (consulta() !== consultaCargada) {
        try { await cargarPromociones(); } catch { return; }
        calcular();
      }
      montarMapa();
      mapa?.resize();
    });
  }

  function ocultar() {
    visible = false;
    detener();
    cerrarAmpliado();
  }

  return { mostrar, ocultar };
}
