import { requireSession, getJSON, almacenSesion, cardName, revelarPagina } from './comun.js';
import { textoVigencia, textoVencePronto, hoyEnElSalvador, textoOtrasTarjetas, mostrarImagen, mostrarCondiciones, mostrarDias } from './promocion-vista.js';
import { filtrosActivos, textoBotonFiltros } from './filtros-activos.js';
import { crearAviso } from './aviso-deshacer.js';
import { diapositivasFranja } from './franja.js';
import { montarCarrusel } from './carrusel.js';
import { destinoEntradaPromociones } from './menu-modelo.js';
import { registrarAperturaPromociones } from './usuarios-prueba.js';
import { conIndicador } from './transiciones.js';
import { conMinimoCarga } from './carga-tiempo.js';
import { guardarInstantanea, leerInstantanea, marcarVencidas, visitaVigente } from './instantanea.js';

import {
  leerCategoria, leerHoy, leerBusqueda, leerIntencion, normalizarBusqueda, categoriaVigente,
  estadoNavegacion, urlConsulta, urlListado, urlDetalle, CHIPS_HOY_BUSCO, textoPrimeroHoyBusco
} from './filtro-categoria.js';
import { leerTarjetaElegida, guardarTarjetaElegida, etiquetaTarjeta, textoTarjeta, conTarjeta } from './tarjeta-elegida.js';

let idsGuardados = [];
let avisoGuardar = null;

// Cabecera: el icono de Guardadas cuenta las guardadas de la sesión.
function pintarContadorGuardadas() {
  const contador = document.querySelector('#pr-contador-guardadas');
  contador.textContent = idsGuardados.length ? String(idsGuardados.length) : '';
  contador.hidden = !idsGuardados.length;
}

function marcarGuardada(boton, guardada) {
  boton.dataset.guardada = guardada ? 'si' : 'no';
  boton.textContent = guardada ? 'Quitar' : 'Guardar';
}

// Guardar o quitar. Con aviso, el cambio se puede deshacer una vez; deshacer no abre otro aviso.
async function alternarGuardada(boton, error, id, conAviso) {
  error.textContent = '';
  const quitar = boton.dataset.guardada === 'si';
  try {
    const response = await fetch('/api/guardadas', {
      method: quitar ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ promocionId: id })
    });
    if (response.status === 401) { location.replace('/index.html'); return; }
    if (!response.ok) throw new Error('No se pudo actualizar. Intenta de nuevo.');
    marcarGuardada(boton, !quitar);
    idsGuardados = quitar ? idsGuardados.filter(guardado => guardado !== id) : [...idsGuardados, id];
    pintarContadorGuardadas();
    if (conAviso) avisoGuardar.mostrar({
      texto: quitar ? 'Promoción quitada de Guardadas.' : 'Promoción guardada.',
      alDeshacer: async () => {
        await alternarGuardada(boton, error, id, false);
        boton.focus?.();
      }
    });
  } catch (fallo) {
    error.textContent = fallo.message;
  }
}

function crearOferta(promotion, categoria, hoy, busqueda, intencion) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  const link = card.querySelector('a');
  link.id = 'promo-' + promotion.id;
  link.href = urlDetalle(promotion.id, categoria, hoy, busqueda, intencion);
  link.setAttribute('aria-label', `${promotion.merchant}: ${promotion.benefit}. Ver promoción`);
  // Sistema visual: el acento de la tarjeta sale de su categoría y las exclusivas Black van en oscuro.
  const articulo = card.querySelector('article');
  articulo.dataset.categoria = promotion.category ?? '';
  if (promotion.exclusive) articulo.dataset.exclusiva = 'si';
  card.querySelector('h2').textContent = promotion.merchant;
  card.querySelector('.promo-benefit').textContent = promotion.benefit;
  card.querySelector('.promo-description').textContent = promotion.description;
  card.querySelector('.promo-category').textContent = promotion.categoryName || promotion.category;
  card.querySelector('.promo-validity').textContent = textoVigencia(promotion);
  const vence = card.querySelector('.promo-ending');
  vence.textContent = textoVencePronto(promotion, hoyEnElSalvador());
  vence.hidden = !vence.textContent;
  // H22: una sola razón del motor; los criterios declarados solo como insignias.
  const razon = card.querySelector('.promo-reason');
  razon.textContent = promotion.razon?.texto ?? '';
  razon.hidden = !razon.textContent;
  const insignias = card.querySelector('.promo-badges');
  insignias.textContent = (promotion.insignias ?? []).map(insignia => insignia.texto).join(' · ');
  insignias.hidden = !insignias.textContent;
  const vencida = card.querySelector('.promo-expired');
  vencida.textContent = 'Vencida';
  vencida.hidden = !promotion.vencida;
  const aplica = card.querySelector('.promo-applicability');
  aplica.textContent = 'Aplica a tu tarjeta ' + (promotion.applicableCard === 'black' ? 'Black' : 'Básica');
  aplica.dataset.tarjeta = promotion.applicableCard === 'black' ? 'black' : 'basica';
  // Todas las tarjetas (SCRUM-133): la otra tarjeta propia solo se menciona si su beneficio cambia.
  const otras = card.querySelector('.promo-otras');
  otras.textContent = textoOtrasTarjetas(promotion);
  otras.hidden = !otras.textContent;
  const badge = card.querySelector('.promo-exclusive');
  badge.hidden = !promotion.exclusive;
  badge.textContent = promotion.exclusive ? 'Exclusiva Black' : '';
  if (promotion.expired || promotion.upcoming || promotion.vencida) link.classList.add('promo-card--inactive');
  mostrarImagen(card.querySelector('.promo-photo'), promotion.imageUrl, promotion.imageAlt);
  mostrarImagen(card.querySelector('.merchant-logo'), promotion.logoUrl);
  // H17 y sistema visual: el reloj dice si aplica hoy o qué días; las condiciones no repiten los días.
  mostrarDias(card.querySelector('.promo-cuando'), promotion);
  mostrarCondiciones(card.querySelector('.promo-conditions'), promotion, { dias: false });
  const boton = card.querySelector('.guardar-promo');
  const error = card.querySelector('.guardar-error');
  marcarGuardada(boton, idsGuardados.includes(promotion.id));
  boton.onclick = event => {
    event.preventDefault();
    event.stopPropagation();
    return alternarGuardada(boton, error, promotion.id, true);
  };
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
  let aperturaRegistrada = false;
  let volverDelDetalle = location.hash.startsWith('#promo-');
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
    return nombre ? `No hay promociones de ${nombre} para tu perfil.` : 'No hay promociones para tus intereses.';
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
    const descripcion = filtroTarjeta ? cardName(filtroTarjeta) : tarjetas.length === 1 ? cardName(tarjetas[0]) : `${tarjetas.length} tarjetas`;
    if (sessionBadge) sessionBadge.textContent = `${profile.nombre} · ${descripcion}`;
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

  async function leerIdsGuardados() {
    if (typeof fetch !== 'function') return [];
    const aviso = document.querySelector('#saved-status');
    try {
      const response = await fetch('/api/guardadas', { cache: 'no-store' });
      if (response.status === 401) { location.replace('/index.html'); return []; }
      if (!response.ok) throw new Error('No se pudieron cargar las promociones guardadas.');
      const datos = await response.json();
      if (aviso) aviso.textContent = '';
      return datos.ids || [];
    } catch (error) {
      if (aviso) aviso.textContent = error.message;
      return [];
    }
  }

  // Categorías vigentes (H5) y tarjetas propias (H16) se cargan juntas; si algo falla, Reintentar.
  async function prepararPagina() {
    status.textContent = '';
    status.className = 'note';
    retry.hidden = true;
    let lista;
    try {
      if (!aperturaRegistrada) { await registrarAperturaPromociones(); aperturaRegistrada = true; }
      if (new URLSearchParams(location.search).get('entrada') === 'menu') {
        preferencias = await getJSON('/api/preferencias');
        const destino = destinoEntradaPromociones(location.search, preferencias);
        if (destino) { location.replace(destino); return false; }
      }
      revelarPagina();
      [categorias, lista] = await Promise.all([getJSON('/api/categorias'), getJSON('/api/tarjetas')]);
    } catch (error) {
      revelarPagina();
      status.textContent = error.message;
      status.className = 'error';
      retry.hidden = false;
      return false;
    }
    CHIPS_HOY_BUSCO.forEach(crearChipIntencion);
    categorias.forEach(crearFiltro);
    categoria = categoriaVigente(pedida, categorias)?.id ?? null;
    mostrarFiltro(urlListado(categoria, null, hoy, busqueda, intencion) + location.hash);
    tarjetas = lista;
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
    intentBox.hidden = false;
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
      promociones, hoy: hoyEnElSalvador(), estrategia, guardadas: idsGuardados, encuestaPendiente: preferencias?.completed === false
    }) : [];
    franja.hidden = diapositivas.length === 0;
    if (diapositivas.length) carrusel = montarCarrusel(franja, diapositivas, { enlace: enlaceAviso, alPulsar: irAPromocion });
  }

  async function loadPromotions() {
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
      const consulta = conTarjeta(urlConsulta(categoria, hoy, busqueda, intencion), filtroTarjeta?.id);
      // H22 y H25: al volver del detalle se conserva el orden de la visita; entrar o cambiar un filtro o chip lo recalcula.
      const guardada = volverDelDetalle ? leerInstantanea(sesion, profile.id, consulta) : null;
      volverDelDetalle = false;
      const respuesta = guardada ?? await conMinimoCarga(() => getJSON(consulta));
      if (turno !== consultaActual) return; // Llegó tarde: ya se eligió otro filtro u otra tarjeta.
      if (!guardada) guardarInstantanea(sesion, profile.id, consulta, respuesta);
      const promotions = marcarVencidas(respuesta.promociones);
      idsGuardados = await leerIdsGuardados();
      if (turno !== consultaActual) return;
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
      emptyPreferences.hidden = !vacio || sinCatalogo || hoy || Boolean(busqueda);
      const seleccionado = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (seleccionado?.classList.contains('promo-card')) seleccionado.scrollIntoView({ block: 'center' });
    } catch (error) {
      if (turno !== consultaActual) return;
      pintarFranja([]);
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

  async function cargar() {
    if (!preparada && !await conIndicador(indicador, prepararPagina)) return;
    if (tarjetas.length) await loadPromotions();
  }

  const [todas] = chips;
  todas.addEventListener('click', () => elegir(null));
  showAll.addEventListener('click', () => elegir(null));
  todayFilter.addEventListener('click', () => cambiarHoy(!hoy));
  exitToday.addEventListener('click', () => cambiarHoy(false));
  searchInput.addEventListener('input', () => buscarComercio(searchInput.value));
  clearSearch.addEventListener('click', () => buscarComercio(''));
  clearSearchEmpty.addEventListener('click', () => buscarComercio(''));
  retry.addEventListener('click', cargar);
  // Hoja Filtros: los cambios se aplican al tocarlos; Listo, Esc o tocar fuera la cierran.
  abrirFiltros.addEventListener('click', () => hojaFiltros.showModal());
  document.querySelector('#cerrar-filtros').addEventListener('click', () => hojaFiltros.close());
  hojaFiltros.addEventListener('click', evento => { if (evento.target === hojaFiltros) hojaFiltros.close(); });
  await cargar();
}
