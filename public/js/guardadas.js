import { requireSession, almacenSesion, cardName, getJSON } from './comun.js';
import { llenarTarjetaPromocion } from './tarjeta-promocion.js';
import { consultarGuardadas, marcarBoton, cambiarGuardada, alPulsarGuardar } from './guardar-promo.js';
import { leerTarjetaElegida, tarjetaActiva } from './tarjeta-elegida.js';
import { volverConHistorial } from './volver.js';
import { crearAviso } from './aviso-deshacer.js';

let ultimoDatos = null;
let avisoQuitar = null;
let busqueda = '';
let timerBusqueda = null;

function limpiarTexto(valor) {
  if (typeof valor !== 'string') return '';
  const limpio = valor.trim();
  return limpio.length <= 100 ? limpio : '';
}

function pintarVacio(datos, visibles) {
  const ninguna = document.querySelector('#empty-none');
  const filtro = document.querySelector('#empty-filter');
  const sinBusqueda = document.querySelector('#empty-search');
  const limpiarVacio = document.querySelector('#clear-search-empty');
  const cambiarPreferencias = document.querySelector('#empty-preferences');
  const accion = document.querySelector('#empty-action');
  const hayVisibles = visibles.length > 0;
  const vacioPorBusqueda = !hayVisibles && Boolean(busqueda) && datos.ids?.length > 0 && !datos.sinCoincidencias;
  const porIntereses = Boolean(datos.sinCoincidencias && datos.motivoSinCoincidencias === 'intereses');
  ninguna.hidden = hayVisibles || datos.sinCoincidencias || vacioPorBusqueda;
  filtro.hidden = !datos.sinCoincidencias;
  // --- INICIO DE LA LÓGICA DEL CASO MIXTO ---
  if (datos.sinCoincidencias) {
    if (porIntereses) {
      let texto = 'Ninguna promoción guardada coincide con tus intereses actuales.';
      if (datos.tambienOcultasPorTarjeta) {
        texto += ' Algunas tampoco aplican a tu tarjeta.';
      }
      filtro.textContent = texto;
    } else {
      filtro.textContent = 'Ninguna promoción guardada aplica ahora a tu tarjeta.';
    }
  }
  // --- FIN DE LA LÓGICA DEL CASO MIXTO ---
  if (sinBusqueda) sinBusqueda.hidden = !vacioPorBusqueda;
  if (limpiarVacio) limpiarVacio.hidden = !vacioPorBusqueda;
  if (cambiarPreferencias) cambiarPreferencias.hidden = !porIntereses;
  accion.hidden = hayVisibles || vacioPorBusqueda;
}

function tarjeta(promotion, tarjetaId) {
  const card = document.querySelector('#promotion-card').content.cloneNode(true);
  const extra = busqueda ? '&comercio=' + encodeURIComponent(busqueda) : '';
  llenarTarjetaPromocion(card, promotion, { href: '/detalle.html?id=' + encodeURIComponent(promotion.id) + '&desde=guardadas' + extra });
  const boton = card.querySelector('.guardar-promo');
  marcarBoton(boton, true);
  alPulsarGuardar(boton, promotion.id, async guardada => {
    if (guardada) return;
    avisoQuitar.mostrar({
      texto: 'Promoción quitada de Guardadas.',
      alDeshacer: async () => {
        try {
          // Tras quitar, el botón quedó en «Guardar»: volver a pulsarlo la guarda otra vez.
          if (await cambiarGuardada(boton, promotion.id) === null) return;
          await loadSaved(tarjetaId);
          boton.focus?.();
        } catch (error) {
          const estado = document.querySelector('#list-status');
          estado.textContent = error.message;
          estado.className = 'error';
        }
      }
    });
    await loadSaved(tarjetaId);
  });
  return card;
}

// La API ya aplica el filtro de comercio; aquí solo renderizamos lo que llegó.
function renderizarGuardadas(datos, tarjetaId) {
  const cards = document.querySelector('#cards');
  cards.replaceChildren();
  const visibles = datos.promociones;
  for (const promotion of visibles) cards.append(tarjeta(promotion, tarjetaId));
  pintarVacio(datos, visibles);
}

async function loadSaved(tarjetaId) {
  const status = document.querySelector('#list-status');
  const cards = document.querySelector('#cards');
  const retry = document.querySelector('#retry');
  status.textContent = 'Cargando guardadas…';
  status.className = 'note';
  retry.hidden = true;
  cards.replaceChildren();
  document.querySelector('#empty-none').hidden = true;
  document.querySelector('#empty-filter').hidden = true;
  const sinBusqueda = document.querySelector('#empty-search');
  const limpiarVacio = document.querySelector('#clear-search-empty');
  const cambiarPreferencias = document.querySelector('#empty-preferences');
  if (sinBusqueda) sinBusqueda.hidden = true;
  if (limpiarVacio) limpiarVacio.hidden = true;
  if (cambiarPreferencias) cambiarPreferencias.hidden = true;
  document.querySelector('#empty-action').hidden = true;
  try {
    // La búsqueda se delega a la API para que sea la única fuente de verdad.
    const datos = await consultarGuardadas(tarjetaId, busqueda || null);
    if (!datos) return;
    ultimoDatos = datos;
    status.textContent = '';
    renderizarGuardadas(datos, tarjetaId);
  } catch (error) {
    status.textContent = error.message;
    status.className = 'error';
    retry.hidden = false;
  }
}

const profile = await requireSession();
if (profile) {
  volverConHistorial(document.querySelector('.pr-volver'));
  avisoQuitar = crearAviso(document.querySelector('#pr-aviso'));
  const searchInput = document.querySelector('#merchant-search');
  const clearSearch = document.querySelector('#clear-search');
  const clearSearchEmpty = document.querySelector('#clear-search-empty');
  if (typeof location !== 'undefined' && typeof URLSearchParams !== 'undefined') {
    const mismoPerfil = typeof history === 'undefined' || !history.state?.perfil || history.state.perfil === profile.id;
    busqueda = mismoPerfil ? limpiarTexto(new URLSearchParams(location.search).get('comercio')) : '';
    if (searchInput) searchInput.value = busqueda;
    if (clearSearch) clearSearch.hidden = !busqueda;
  }
  let tarjetaId = leerTarjetaElegida(almacenSesion(), profile.id);
  try {
    const activa = tarjetaActiva(await getJSON('/api/tarjetas'), tarjetaId);
    if (activa) {
      tarjetaId = activa.id;
      const badge = document.querySelector('#session-profile');
      if (badge) badge.textContent = `${profile.nombre} · ${cardName(activa)}`;
    }
  } catch { /* si las tarjetas fallan, la lista sigue con la elección guardada */ }

  // Registrar el perfil en el historial al cargar para evitar arrastre entre sesiones (CDA 5).
  if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
    const url = '/guardadas.html' + (busqueda ? '?comercio=' + encodeURIComponent(busqueda) : '');
    history.replaceState({ perfil: profile.id }, '', url);
  }

  function actualizarBusqueda(texto) {
    if (searchInput) searchInput.value = texto;
    if (clearSearch) clearSearch.hidden = !texto;
    busqueda = limpiarTexto(texto);
    if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
      const url = '/guardadas.html' + (busqueda ? '?comercio=' + encodeURIComponent(busqueda) : '');
      history.replaceState({ perfil: profile.id }, '', url);
    }
    // Debounce: espera 300 ms antes de consultar la API para evitar peticiones con cada tecla.
    if (timerBusqueda != null) clearTimeout(timerBusqueda);
    timerBusqueda = setTimeout(() => {
      timerBusqueda = null;
      loadSaved(tarjetaId);
    }, 300);
  }

  if (searchInput) searchInput.addEventListener('input', () => actualizarBusqueda(searchInput.value));
  // SCRUM-152: la tecla Buscar del teclado quita el foco para cerrarlo; la lista ya se filtra al escribir.
  if (searchInput) searchInput.addEventListener('keydown', evento => {
    if (evento.key !== 'Enter') return;
    evento.preventDefault();
    searchInput.blur();
  });
  if (clearSearch) clearSearch.addEventListener('click', () => actualizarBusqueda(''));
  if (clearSearchEmpty) clearSearchEmpty.addEventListener('click', () => actualizarBusqueda(''));
  document.querySelector('#retry').addEventListener('click', () => loadSaved(tarjetaId));
  await loadSaved(tarjetaId);
}
