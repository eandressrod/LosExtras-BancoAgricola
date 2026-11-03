import { requireSession, getJSON, almacenSesion, revelarPagina, volverAlLogin } from './comun.js';
import { hoyEnElSalvador } from './promocion-vista.js';
import { llenarTarjetaPromocion } from './tarjeta-promocion.js';
import { marcarBoton, cambiarGuardada, alPulsarGuardar, idsVisiblesGuardadas, cuentaEnGuardadas } from './guardar-promo.js';
import { SECCIONES, seccionVecina, seccionPorDeslizamiento, leerSeccion, guardarSeccion, urlSeccion } from './pestanas.js';
import { filtrosActivos, textoBotonFiltros } from './filtros-activos.js';
import { crearAviso } from './aviso-deshacer.js';
import { diapositivasFranja } from './franja.js';
import { montarCarrusel } from './carrusel.js';
import { registrarAperturaPromociones, marcarEncuesta } from './usuarios-prueba.js';
import { ofertaEncuesta } from './encuesta-modelo.js';
import { abrirEncuestaHoja } from './encuesta-hoja.js';
import { repintarConMovimiento } from './movimiento-lista.js';
import { conIndicador } from './transiciones.js';
import { guardarInstantanea, leerInstantanea, marcarVencidas, visitaVigente } from './instantanea.js';

import {
  leerCategoria, leerHoy, leerBusqueda, leerIntencion, normalizarBusqueda, categoriaVigente,
  estadoNavegacion, urlConsulta, urlListado, urlDetalle, CHIPS_HOY_BUSCO, textoPrimeroHoyBusco
} from './filtro-categoria.js';
import { leerTarjetaElegida, guardarTarjetaElegida, etiquetaTarjeta, textoTarjeta, conTarjeta, textoInsignia } from './tarjeta-elegida.js';
import { crearCerca } from './cerca/pantalla.js';
import { conEspera } from './espera-carga.js';

let idsGuardados = [];
let idsVisibles = [];
let categoriasContador = [];
// Cuántas tarjetas tiene el perfil: con más de una, cada promoción dice con cuáles aplica.
let totalTarjetas = 1;
let avisoGuardar = null;

function fijarCategoriasContador(datos) {
  categoriasContador = datos?.completed && Array.isArray(datos.categories) ? datos.categories : [];
}

// Cabecera: el icono cuenta las guardadas que se ven con la tarjeta y los intereses.
function pintarContadorGuardadas() {
  const contador = document.querySelector('#pr-contador-guardadas');
  contador.textContent = idsVisibles.length ? String(idsVisibles.length) : '';
  contador.hidden = !idsVisibles.length;
}

function anotarGuardada(promotion, guardada) {
  const id = promotion.id;
  idsGuardados = guardada ? [...idsGuardados, id] : idsGuardados.filter(guardado => guardado !== id);
  // SCRUM-140: el icono cuenta las que se ven con la tarjeta y los intereses.
  if (!guardada) idsVisibles = idsVisibles.filter(guardado => guardado !== id);
  else if (cuentaEnGuardadas(promotion, categoriasContador) && !idsVisibles.includes(id)) idsVisibles = [...idsVisibles, id];
  pintarContadorGuardadas();
}

function crearOferta(promotion, categoria, hoy, busqueda, intencion) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  // Con varias tarjetas, el pie dice con cuáles aplica; la otra tarjeta se menciona aparte si su beneficio cambia.
  const link = llenarTarjetaPromocion(card, promotion, { href: urlDetalle(promotion.id, categoria, hoy, busqueda, intencion), totalTarjetas });
  link.id = 'promo-' + promotion.id;
  if (promotion.expired || promotion.upcoming || promotion.vencida) link.classList.add('promo-card--inactive');
  const boton = card.querySelector('.guardar-promo');
  const error = card.querySelector('.guardar-error');
  boton.dataset.promocion = promotion.id;
  marcarBoton(boton, idsGuardados.includes(promotion.id));
  // El cambio se puede deshacer una vez desde el aviso; deshacer no abre otro aviso.
  alPulsarGuardar(boton, promotion.id, guardada => {
    anotarGuardada(promotion, guardada);
    avisoGuardar.mostrar({
      texto: guardada ? 'Promoción guardada.' : 'Promoción quitada de Guardadas.',
      alDeshacer: async () => {
        error.textContent = '';
        try {
          const deshecha = await cambiarGuardada(boton, promotion.id);
          if (deshecha !== null) anotarGuardada(promotion, deshecha);
        } catch (fallo) {
          error.textContent = fallo.message;
        }
        boton.focus?.();
      }
    });
  }, error);
  return card;
}

const profile = await requireSession({ revelar:false });
if (profile) {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  const showAll = document.querySelector('#show-all');
  const exitToday = document.querySelector('#exit-today');
  const clearSearchEmpty = document.querySelector('#clear-search-empty');
  const emptyPreferences = document.querySelector('#empty-preferences');
  const searchBox = document.querySelector('#search-box');
  const searchInput = document.querySelector('#merchant-search');
  const clearSearch = document.querySelector('#clear-search');
  const todayFilter = document.querySelector('#today-filter');
  const filtros = document.querySelector('#category-filter');
  const chips = [...document.querySelectorAll('.filter-chip')];
  const intentBox = document.querySelector('#intent-box');
  const intentFilter = document.querySelector('#intent-filter');
  const intentStatus = document.querySelector('#intent-status');
  const chipsIntencion = [];
  const cardChoice = document.querySelector('#card-choice');
  const cardOptions = document.querySelector('#card-options');
  const cardSingle = document.querySelector('#card-single');
  const sessionBadge = document.querySelector('#session-profile');
  const abrirFiltros = document.querySelector('#abrir-filtros');
  const hojaFiltros = document.querySelector('#filtros');
  const pildoras = document.querySelector('#filtros-activos');
  const franja = document.querySelector('#franja');
  const conteo = document.querySelector('#pr-conteo');
  const surveyNotice = document.querySelector('#survey-notice');
  const avisoEncuesta = document.querySelector('#encuesta-aviso');
  const pestanas = document.querySelector('.pr-pestanas');
  const botonesSeccion = SECCIONES.map(id => document.querySelector('#tab-' + id));
  const panelLista = document.querySelector('#panel-lista');
  const panelCerca = document.querySelector('#panel-cerca');
  avisoGuardar = crearAviso(document.querySelector('#pr-aviso'));
  let carrusel = null;
  let preferencias = null;
  const sesion = almacenSesion();
  const pedida = leerCategoria(location.search, history.state, profile.id);
  const opcionesTarjeta = [];
  let categorias = null;
  let categoria = null;
  let hoy = leerHoy(location.search, history.state, profile.id);
  let busqueda = leerBusqueda(location.search, history.state, profile.id);
  // H25: el chip de la URL solo sigue activo dentro de la misma visita (CDA 6).
  let intencion = visitaVigente(sesion, profile.id) ? leerIntencion(location.search, history.state, profile.id) : null;
  // H16 desde el 24 de octubre: Para ti considera todas las tarjetas propias; filtroTarjeta (null = todas) es opcional.
  let tarjetas = [];
  let filtroTarjeta = null;
  let preparada = false;
  let consultaActual = 0;
  let timerBusqueda = null;
  let marcas = null;
  // H21 (ADR-010): qué se ofrece de la encuesta en esta visita ('hoja', 'aviso' o null). «Mis preferencias» la pide con ?encuesta=1.
  const encuestaPedida = new URLSearchParams(location.search).get('encuesta') === '1';
  let ofertaDeEncuesta = null;
  let listaActual = [];
  let volverDelDetalle = location.hash.startsWith('#promo-');
  // Sección elegida en esta visita; al volver del detalle se abre la misma.
  let seccion = leerSeccion(sesion, profile.id);
  // H8: el mapa del detalle abre Cerca de ti centrado en su sucursal.
  const enfocarSucursal = new URLSearchParams(location.search).get('sucursal');
  if (enfocarSucursal) {
    seccion = 'cerca';
    guardarSeccion(sesion, profile.id, seccion);
  }
  // Cerca de ti consulta Para ti con los mismos filtros y ordena por cercanía en el navegador.
  const cerca = crearCerca({
    perfil: profile, enfocarSucursal,
    consulta: () => conTarjeta(urlConsulta(categoria, hoy, busqueda, intencion), filtroTarjeta?.id),
    urlDetalle: id => urlDetalle(id, categoria, hoy, busqueda, intencion)
  });
  const indicador = document.querySelector('#promotions-loading');

  searchInput.value = busqueda ?? '';
  clearSearch.hidden = !searchInput.value;

  // H5, H17, H10 y H25: los filtros y el chip activo quedan marcados y en la entrada del historial para volver del detalle.
  function mostrarFiltro(url) {
    for (const chip of chips) chip.setAttribute('aria-pressed', String((chip.dataset.category || null) === categoria));
    todayFilter.setAttribute('aria-pressed', String(hoy));
    // Grupo de radio: solo el chip marcado (o el primero, si no hay) entra en la tabulación.
    const enTabulacion = chipsIntencion.find(chip => chip.dataset.intent === intencion) ?? chipsIntencion[0];
    for (const chip of chipsIntencion) {
      chip.setAttribute('aria-checked', String(chip.dataset.intent === intencion));
      chip.setAttribute('tabindex', chip === enTabulacion ? '0' : '-1');
    }
    const primero = textoPrimeroHoyBusco(intencion);
    intentStatus.textContent = primero;
    intentStatus.hidden = !primero;
    history.replaceState(estadoNavegacion(profile.id, categoria), '', url);
    pintarFiltrosActivos();
  }

  // Sobre la lista solo se ven los filtros activos; cada píldora quita el suyo.
  function pintarFiltrosActivos() {
    const activos = filtrosActivos({ categoria, categorias: categorias ?? [], hoy, tarjeta: filtroTarjeta });
    const quitar = { categoria: () => elegir(null), tarjeta: () => cambiarTarjeta(null), hoy: () => cambiarHoy(false) };
    pildoras.replaceChildren(...activos.map(({ tipo, texto }) => {
      const pildora = document.createElement('button');
      pildora.type = 'button';
      pildora.className = 'pr-pildora';
      pildora.dataset.tipo = tipo;
      pildora.textContent = texto;
      pildora.setAttribute('aria-label', 'Quitar filtro ' + texto);
      pildora.addEventListener('click', quitar[tipo]);
      return pildora;
    }));
    pildoras.hidden = activos.length === 0;
    abrirFiltros.setAttribute('aria-label', textoBotonFiltros(activos.length));
    abrirFiltros.dataset.activos = String(activos.length);
  }

  function textoVacio() {
    const nombre = categoria && categoriaVigente(categoria, categorias).nombre;
    if (busqueda) {
      if (hoy) return nombre ? `No hay promociones de ${nombre} disponibles hoy para "${busqueda}".` : `No hay promociones disponibles hoy para "${busqueda}".`;
      return nombre ? `No hay promociones de ${nombre} para "${busqueda}".` : `No hay promociones para "${busqueda}".`;
    }
    if (hoy) return nombre ? `No hay promociones de ${nombre} disponibles hoy para tu perfil.` : 'No hay promociones disponibles hoy para tu perfil.';
    if (nombre) return `No hay promociones de ${nombre} para tu perfil.`;
    return seccion === 'explorar' ? 'No hay promociones para tus tarjetas.' : 'No hay promociones para tus intereses.';
  }

  // Pestañas: solo la elegida entra en la tabulación. Para ti y Explorar comparten la lista; Cerca de ti, el mapa.
  // «Hoy busco» ordena Para ti, así que su tira solo se ve ahí.
  function mostrarSeccion() {
    botonesSeccion.forEach((boton, indice) => {
      const elegida = SECCIONES[indice] === seccion;
      boton.setAttribute('aria-selected', String(elegida));
      boton.setAttribute('tabindex', elegida ? '0' : '-1');
    });
    pestanas.dataset.seccion = seccion;
    panelCerca.hidden = seccion !== 'cerca';
    panelLista.hidden = seccion === 'cerca';
    panelLista.setAttribute('aria-labelledby', 'tab-' + (seccion === 'explorar' ? 'explorar' : 'para-ti'));
    intentBox.hidden = !tarjetas.length || seccion !== 'para-ti';
    if (seccion === 'cerca') {
      cerca.mostrar();
      // Cerca de ti no pasa por loadPromotions: el contador de Guardadas se pide aquí (SCRUM-145).
      refrescarContadorGuardadas();
    } else cerca.ocultar();
  }

  function cambiarSeccion(nueva) {
    if (nueva === seccion) return;
    seccion = nueva;
    guardarSeccion(sesion, profile.id, seccion);
    mostrarSeccion();
    if (seccion !== 'cerca' && tarjetas.length) return loadPromotions();
  }

  // Teclado de las pestañas: flechas, Inicio y Fin mueven el foco y eligen la sección.
  function moverSeccion(evento) {
    const actual = SECCIONES.indexOf(seccion);
    const destino = { ArrowRight: actual + 1, ArrowLeft: actual - 1, Home: 0, End: SECCIONES.length - 1 }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    const elegida = SECCIONES[Math.min(Math.max(destino, 0), SECCIONES.length - 1)];
    botonesSeccion[SECCIONES.indexOf(elegida)].focus();
    return cambiarSeccion(elegida);
  }

  // Deslizar a los lados sobre la lista o el mapa cambia a la sección vecina; un gesto vertical solo desplaza.
  function escucharDeslizamiento(panel) {
    let inicio = null;
    panel.addEventListener('touchstart', evento => {
      // Sobre el mapa, arrastrar mueve el mapa, no la sección.
      if (evento.target.closest?.('.pr-mapa')) { inicio = null; return; }
      const toque = evento.touches[0];
      inicio = evento.touches.length === 1 ? { x: toque.clientX, y: toque.clientY } : null;
    }, { passive: true });
    panel.addEventListener('touchend', evento => {
      if (!inicio) return;
      const toque = evento.changedTouches[0];
      const paso = seccionPorDeslizamiento(toque.clientX - inicio.x, toque.clientY - inicio.y);
      inicio = null;
      if (paso) cambiarSeccion(seccionVecina(seccion, paso));
    }, { passive: true });
  }

  function crearFiltro(item) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter-chip';
    chip.dataset.category = item.id;
    chip.textContent = item.nombre;
    chip.addEventListener('click', () => elegir(item.id));
    filtros.append(chip);
    chips.push(chip);
  }

  function crearChipIntencion(item) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'pr-hoy__chip';
    chip.setAttribute('role', 'radio');
    chip.setAttribute('aria-checked', 'false');
    chip.setAttribute('aria-label', item.nombre);
    chip.dataset.intent = item.id;
    chip.textContent = item.corto;
    chip.addEventListener('click', () => cambiarIntencion(item.id));
    chip.addEventListener('keydown', evento => moverIntencion(chip, evento));
    intentFilter.append(chip);
    chipsIntencion.push(chip);
  }

  // La tira se desvanece a la derecha mientras quedan chips por ver; al llegar al último se ve completa.
  function marcarFinalTira() {
    intentFilter.toggleAttribute?.('data-final', intentFilter.scrollLeft + intentFilter.clientWidth >= intentFilter.scrollWidth - 2);
  }

  // Teclado del grupo de radio: las flechas (con vuelta), Inicio y Fin mueven el foco y marcan ese chip.
  function moverIntencion(chip, evento) {
    const actual = chipsIntencion.indexOf(chip);
    const total = chipsIntencion.length;
    const destino = { ArrowRight: actual + 1, ArrowDown: actual + 1, ArrowLeft: actual - 1, ArrowUp: actual - 1, Home: 0, End: total - 1 }[evento.key];
    if (destino === undefined) return;
    evento.preventDefault();
    const siguiente = chipsIntencion[(destino + total) % total];
    siguiente.focus();
    if (siguiente.dataset.intent !== intencion) return cambiarIntencion(siguiente.dataset.intent);
  }

  // H16: el filtro de tarjeta se marca en la hoja Filtros y la cabecera dice qué tarjetas se consideran.
  function mostrarTarjeta() {
    for (const opcion of opcionesTarjeta) opcion.setAttribute('aria-pressed', String(opcion.dataset.card === (filtroTarjeta?.id ?? '')));
    if (sessionBadge) sessionBadge.textContent = textoInsignia(profile, tarjetas, filtroTarjeta?.id);
    pintarFiltrosActivos();
  }

  // item null = «Todas mis tarjetas».
  function crearOpcionTarjeta(item) {
    const opcion = document.createElement('button');
    opcion.type = 'button';
    opcion.className = 'card-option';
    opcion.dataset.card = item?.id ?? '';
    opcion.dataset.tipo = item?.tipoTarjeta ?? 'todas';
    opcion.textContent = item ? etiquetaTarjeta(item) : 'Todas mis tarjetas';
    opcion.addEventListener('click', () => cambiarTarjeta(item));
    cardOptions.append(opcion);
    opcionesTarjeta.push(opcion);
  }

  function mostrarSinTarjetas() {
    status.textContent = 'No tienes tarjetas para consultar beneficios.';
    status.className = 'note';
    intentBox.hidden = true;
    filtros.hidden = true;
    todayFilter.hidden = true;
    searchBox.hidden = true;
    abrirFiltros.hidden = true;
  }

  async function refrescarContadorGuardadas() {
    const guardadas = await leerIdsGuardados();
    idsGuardados = guardadas.ids;
    idsVisibles = guardadas.visibles;
    pintarContadorGuardadas();
  }

  async function leerIdsGuardados(signal) {
    if (typeof fetch !== 'function') return { ids: [], visibles: [] };
    const aviso = document.querySelector('#saved-status');
    const ruta = filtroTarjeta?.id
      ? '/api/guardadas?tarjeta=' + encodeURIComponent(filtroTarjeta.id)
      : '/api/guardadas';
    try {
      const response = await fetch(ruta, { cache: 'no-store', signal });
      if (response.status === 401) { volverAlLogin(); return { ids: [], visibles: [] }; }
      if (!response.ok) throw new Error();
      const datos = await response.json();
      if (aviso) aviso.textContent = '';
      return {
        ids: Array.isArray(datos.ids) ? datos.ids : [],
        visibles: idsVisiblesGuardadas(datos)
      };
    } catch {
      // Cortada por tardar: el error de la lista ya ofrece Reintentar.
      if (signal?.aborted) return { ids: [], visibles: [] };
      // Sin conexión, fetch rechaza con un texto técnico del navegador: siempre se muestra el propio.
      if (aviso) aviso.textContent = 'No se pudieron cargar las promociones guardadas.';
      return { ids: [], visibles: [] };
    }
  }

  // SCRUM-142: al volver con Atrás o «Volver al listado», la página se restaura tal como estaba; las guardadas pudieron
  // cambiar en el detalle o en Guardadas, así que se releen.
  addEventListener('pageshow', async event => {
    if (!event.persisted) return;
    const guardadas = await leerIdsGuardados();
    idsGuardados = guardadas.ids;
    idsVisibles = guardadas.visibles;
    pintarContadorGuardadas();
    for (const boton of document.querySelectorAll('.guardar-promo')) marcarBoton(boton, idsGuardados.includes(boton.dataset.promocion));
  });

  // Categorías vigentes (H5) y tarjetas propias (H16) se cargan juntas; si algo falla, Reintentar.
  async function prepararPagina() {
    status.textContent = '';
    status.className = 'note';
    retry.hidden = true;
    let lista;
    try {
      // Todo lo que la página necesita se pide a la vez. La apertura devuelve las marcas de la encuesta guardadas en el servidor;
      // con las preferencias se decide qué ofrecer.
      [marcas, preferencias, categorias, lista] = await Promise.all([
        marcas ?? registrarAperturaPromociones(), getJSON('/api/preferencias'), getJSON('/api/categorias'), getJSON('/api/tarjetas')
      ]);
      fijarCategoriasContador(preferencias);
      ofertaDeEncuesta = ofertaEncuesta({ pendiente: !preferencias.completed, pedida: encuestaPedida, ...marcas });
      // La hoja va sobre la lista de Para ti, aunque la visita anterior quedara en otra sección.
      if (ofertaDeEncuesta === 'hoja') seccion = 'para-ti';
      revelarPagina();
    } catch (error) {
      revelarPagina();
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
      return false;
    }
    CHIPS_HOY_BUSCO.forEach(crearChipIntencion);
    intentFilter.addEventListener('scroll', marcarFinalTira, { passive: true });
    categorias.forEach(crearFiltro);
    categoria = categoriaVigente(pedida, categorias)?.id ?? null;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda, intencion) + location.hash);
    tarjetas = lista;
    totalTarjetas = Math.max(1, tarjetas.length);
    preparada = true;
    if (!tarjetas.length) {
      mostrarSinTarjetas();
      return false;
    }
    // Una elección guardada que ya no es propia se descarta y se vuelve a todas.
    const elegida = leerTarjetaElegida(sesion, profile.id);
    filtroTarjeta = (elegida && tarjetas.find(item => item.id === elegida)) || null;
    if (!filtroTarjeta) guardarTarjetaElegida(sesion, profile.id, null);
    if (tarjetas.length > 1) {
      [null, ...tarjetas].forEach(crearOpcionTarjeta);
      cardChoice.hidden = false;
    } else {
      cardSingle.textContent = 'Tus beneficios con ' + textoTarjeta(tarjetas[0]);
      cardSingle.hidden = false;
    }
    // H25: la tira «Hoy busco» aparece cuando hay tarjetas con las que consultar, no mientras carga.
    mostrarSeccion();
    mostrarTarjeta();
    return true;
  }

  // Franja de avisos: se recalcula con cada lista; un aviso de promoción desplaza la lista hasta ella.
  function enlaceAviso(accion) {
    if (accion.tipo === 'ir') return accion.destino;
    return accion.tipo === 'detalle' ? urlDetalle(accion.id, categoria, hoy, busqueda, intencion) : null;
  }

  function irAPromocion(accion) {
    const elegida = document.getElementById('promo-' + accion.id)?.closest('.promo-item');
    if (!elegida) { location.assign(urlDetalle(accion.id, categoria, hoy, busqueda, intencion)); return; }
    elegida.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    elegida.classList.remove('pr-resaltada');
    requestAnimationFrame(() => elegida.classList.add('pr-resaltada'));
    elegida.querySelector('a').focus({ preventScroll: true });
  }

  function pintarFranja(promociones, estrategia) {
    carrusel?.parar();
    carrusel = null;
    const diapositivas = promociones.length ? diapositivasFranja({
      promociones, hoy: hoyEnElSalvador(), estrategia, guardadas: idsVisibles
    }) : [];
    franja.hidden = diapositivas.length === 0;
    if (diapositivas.length) carrusel = montarCarrusel(franja, diapositivas, { enlace: enlaceAviso, alPulsar: irAPromocion });
  }

  async function loadPromotions() {
    if (seccion === 'cerca') return cerca.mostrar(); // Cerca de ti tiene su propia lista; un filtro nuevo la recalcula.
    const turno = ++consultaActual;
    conteo.textContent = '';
    status.textContent = '';
    status.className = 'note';
    retry.hidden = true;
    clearSearchEmpty.hidden = true;
    showAll.hidden = true;
    exitToday.hidden = true;
    emptyPreferences.hidden = true;
    cards.replaceChildren();
    indicador.hidden = false;
    try {
      // La API valida la tarjeta y el motor ordena sus beneficios según tus intereses e intención del día, con filtros y búsqueda.
      // Explorar pide lo mismo sin personalizar.
      const consulta = urlSeccion(conTarjeta(urlConsulta(categoria, hoy, busqueda, intencion), filtroTarjeta?.id), seccion);
      // H22 y H25: al volver del detalle se conserva el orden de la visita; entrar o cambiar un filtro o chip lo recalcula.
      const guardada = volverDelDetalle ? leerInstantanea(sesion, profile.id, consulta) : null;
      volverDelDetalle = false;
      // La lista y las guardadas se piden juntas. SCRUM-144: si tardan se avisa, y a los 20 s se cortan con Reintentar.
      const [respuesta, guardadas] = await conEspera(signal => Promise.all([guardada ?? getJSON(consulta, { signal }), leerIdsGuardados(signal)]), {
        // Sobre los rectángulos de carga: el bloque de estado queda debajo de ellos, fuera de la vista.
        alTardar: texto => { if (turno === consultaActual) conteo.textContent = texto; }
      });
      if (turno !== consultaActual) return; // Llegó tarde: ya se eligió otro filtro u otra tarjeta.
      if (!guardada) guardarInstantanea(sesion, profile.id, consulta, respuesta);
      const promotions = marcarVencidas(respuesta.promociones);
      listaActual = promotions;
      idsGuardados = guardadas.ids;
      idsVisibles = guardadas.visibles;
      pintarContadorGuardadas();
      for (const promotion of promotions) cards.append(crearOferta(promotion, categoria, hoy, busqueda, intencion));
      const vacio = promotions.length === 0;
      conteo.textContent = vacio ? '' : promotions.length === 1 ? '1 promoción' : `${promotions.length} promociones`;
      pintarFranja(promotions, respuesta.estrategia);
      const sinCatalogo = respuesta.vacio === 'sin-catalogo';
      status.textContent = !vacio ? '' : sinCatalogo ? 'No hay promociones para tu tarjeta.' : textoVacio();
      clearSearchEmpty.hidden = !vacio || sinCatalogo || !busqueda;
      showAll.hidden = !vacio || sinCatalogo || !categoria;
      exitToday.hidden = !vacio || sinCatalogo || !hoy;
      emptyPreferences.hidden = !vacio || sinCatalogo || hoy || Boolean(busqueda) || seccion === 'explorar';
      const seleccionado = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (seleccionado?.classList.contains('promo-card')) seleccionado.scrollIntoView({ block: 'center' });
    } catch (error) {
      if (turno !== consultaActual) return;
      pintarFranja([]);
      conteo.textContent = '';
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
    } finally {
      if (turno === consultaActual) indicador.hidden = true;
    }
  }

  function elegir(nueva) {
    if (nueva === categoria) return;
    categoria = nueva;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda, intencion));
    return loadPromotions();
  }

  function cambiarHoy(activo) {
    if (!tarjetas.length || activo === hoy) return;
    hoy = activo;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda, intencion));
    return loadPromotions();
  }

  function cambiarIntencion(id) {
    if (!tarjetas.length) return;
    intencion = intencion === id ? null : id;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda, intencion));
    return loadPromotions();
  }

  function buscarComercio(texto) {
    searchInput.value = texto;
    clearSearch.hidden = !texto;
    const nueva = normalizarBusqueda(texto);
    if (nueva === busqueda) return;
    busqueda = nueva;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda, intencion));
    if (!tarjetas.length) return;
    // Debounce: actualiza URL de inmediato pero espera 300 ms antes de consultar la API.
    if (timerBusqueda != null) clearTimeout(timerBusqueda);
    timerBusqueda = setTimeout(() => {
      timerBusqueda = null;
      loadPromotions();
    }, 300);
  }

  function cambiarTarjeta(nueva) {
    if ((nueva?.id ?? null) === (filtroTarjeta?.id ?? null)) return;
    filtroTarjeta = nueva;
    guardarTarjetaElegida(sesion, profile.id, nueva?.id ?? null);
    mostrarTarjeta();
    return loadPromotions();
  }

  // H21: la vista previa de la hoja pinta el orden calculado en el navegador sobre la lista real. Las tarjetas se desplazan
  // 200 ms (CDA 7) en lugar de su animación de entrada, que vuelve al cerrar la hoja.
  function mostrarVistaPrevia({ promociones, contador }) {
    cards.dataset.previa = '';
    repintarConMovimiento(cards, oferta => oferta.querySelector('a')?.id, () => {
      cards.replaceChildren();
      for (const promotion of promociones) cards.append(crearOferta(promotion, categoria, hoy, busqueda, intencion));
    });
    conteo.textContent = contador;
  }

  // Al cerrar la hoja, el orden vuelve a pedirse a /api/para-ti con lo que quedó guardado.
  async function alCerrarEncuesta({ terminada = false } = {}) {
    delete cards.dataset.previa;
    if (terminada) {
      preferencias = await getJSON('/api/preferencias');
      fijarCategoriasContador(preferencias);
    }
    await loadPromotions();
    surveyNotice.hidden = !terminada;
  }

  async function cargar() {
    if (!preparada && !await conIndicador(indicador, prepararPagina)) return;
    if (!tarjetas.length) return;
    await loadPromotions();
    const oferta = ofertaDeEncuesta;
    ofertaDeEncuesta = null;
    avisoEncuesta.hidden = oferta !== 'aviso';
    if (oferta !== 'hoja') return;
    // Solo la apertura automática se marca: la que pide la persona no cuenta como «la primera vez».
    if (!encuestaPedida) marcarEncuesta('hoja-mostrada').catch(() => { /* Sin la marca, la hoja puede volver a abrirse sola. */ });
    await abrirEncuesta();
  }

  // Las opciones y la vista previa salen de todo lo vigente (Explorar, sin filtros): la lista de Para ti ya está recortada por
  // los intereses guardados y, al repetir la encuesta, solo ofrecería lo que ya se eligió. Si falla, se usa la lista visible.
  // SCRUM-139: el aviso se retira cuando la hoja ya cubre la lista; si se ocultara antes, la lista subiría bajo el dedo
  // y un segundo toque abriría la tarjeta de abajo. Mientras se abre, los toques repetidos se ignoran.
  let abriendoEncuesta = false;
  async function abrirEncuesta() {
    if (abriendoEncuesta) return;
    abriendoEncuesta = true;
    let lista = listaActual;
    try {
      lista = (await getJSON(urlSeccion(conTarjeta(urlConsulta(null), filtroTarjeta?.id), 'explorar'))).promociones;
    } catch { /* La hoja funciona con la lista visible. */ }
    try {
      abrirEncuestaHoja({ perfil: profile, lista, categorias, mostrarVistaPrevia, alCerrar: alCerrarEncuesta });
      avisoEncuesta.hidden = true;
    } finally {
      abriendoEncuesta = false;
    }
  }

  // Aviso de la lista (ADR-010): Empezar abre la hoja; cerrarlo una vez lo guarda y no vuelve.
  function cerrarAvisoEncuesta() {
    avisoEncuesta.hidden = true;
    marcarEncuesta('aviso-cerrado').catch(() => { /* Sin la marca, el aviso puede volver en otra visita. */ });
  }

  document.querySelector('#encuesta-aviso-empezar').addEventListener('click', abrirEncuesta);
  document.querySelector('#encuesta-aviso-cerrar').addEventListener('click', cerrarAvisoEncuesta);
  const [todas] = chips;
  todas.addEventListener('click', () => elegir(null));
  showAll.addEventListener('click', () => elegir(null));
  todayFilter.addEventListener('click', () => cambiarHoy(!hoy));
  exitToday.addEventListener('click', () => cambiarHoy(false));
  searchInput.addEventListener('input', () => buscarComercio(searchInput.value));
  // SCRUM-152: la tecla Buscar del teclado quita el foco para cerrarlo; la lista ya se filtra al escribir.
  searchInput.addEventListener('keydown', evento => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    searchInput.blur();
  });
  clearSearch.addEventListener('click', () => buscarComercio(''));
  clearSearchEmpty.addEventListener('click', () => buscarComercio(''));
  retry.addEventListener('click', cargar);
  // Hoja Filtros: los cambios se aplican al tocarlos; Listo, Esc o tocar fuera la cierran.
  abrirFiltros.addEventListener('click', () => hojaFiltros.showModal());
  document.querySelector('#cerrar-filtros').addEventListener('click', () => hojaFiltros.close());
  hojaFiltros.addEventListener('click', evento => { if (evento.target === hojaFiltros) hojaFiltros.close(); });
  botonesSeccion.forEach((boton, indice) => {
    boton.addEventListener('click', () => cambiarSeccion(SECCIONES[indice]));
    boton.addEventListener('keydown', moverSeccion);
  });
  escucharDeslizamiento(panelLista);
  escucharDeslizamiento(panelCerca);
  mostrarSeccion();
  await cargar();
}
