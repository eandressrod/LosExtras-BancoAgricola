import { requireSession, forgetLogin, logout, cardName, cardShortName } from './comun.js';

document.addEventListener('DOMContentLoaded', async () => {
  const get = id => document.getElementById(id);
  const contenido = get('menu-content');
  const cargando = get('menu-loading');
  const errorBox = get('menu-error');
  const errorTexto = get('menu-error-text');
  const cuentasCarousel = get('cuentas-carousel');
  const btnPromociones = get('btn-promociones');
  const btnParaTi = get('btn-tab-parati');
  const btnLogout = get('btn-logout');
  const alertaLogout = get('alerta-logout');
  const btnMisTarjetas = get('btn-mis-tarjetas');
  const btnVerTodas = get('btn-ver-todas');
  let cuentas = [];
  let cargado = false;
  let soloTarjetas = false;
  let saldosVisibles = true;
  let vistaExpandida = false;

  function habilitarPromociones(valor) {
    btnPromociones.disabled = !valor;
    btnParaTi.disabled = !valor;
  }

  function mostrarError() {
    cuentas = [];
    cargado = false;
    cuentasCarousel.replaceChildren();
    get('greeting-title').textContent = '';
    get('greeting-perfil').textContent = '';
    contenido.hidden = true;
    cargando.hidden = true;
    errorTexto.textContent = 'No se pudieron cargar los datos del menú. Intenta de nuevo.';
    errorBox.hidden = false;
    habilitarPromociones(false);
  }

  async function consultarMenu() {
    const res = await fetch('/api/menu', { cache: 'no-store' });
    if (res.status === 401) {
      forgetLogin();
      location.replace('/index.html');
      return null;
    }
    if (!res.ok) throw new Error('No se pudo cargar el menú.');
    return res.json();
  }

  function renderizarCuentas() {
    cuentasCarousel.replaceChildren();
    cuentasCarousel.style.flexWrap = vistaExpandida ? 'wrap' : 'nowrap';
    const lista = soloTarjetas ? cuentas.filter(c => /tarjeta|crédito/i.test(c.tipo)) : cuentas;
    if (!lista.length) {
      const vacio = document.createElement('p');
      vacio.className = 'menu-empty';
      vacio.textContent = soloTarjetas ? 'No hay cuentas de tarjeta registradas.' : 'No tienes cuentas registradas.';
      cuentasCarousel.appendChild(vacio);
      return;
    }
    for (const cuenta of lista) {
      const card = document.createElement('article');
      card.className = 'cuenta-item-card';
      const numero = document.createElement('p');
      numero.className = 'cuenta-item-top';
      numero.textContent = `${cuenta.numeroEnmascarado} · ${cuenta.tipo}`;
      const nombre = document.createElement('h3');
      nombre.className = 'cuenta-item-subtitle';
      nombre.textContent = cuenta.nombre;
      const saldo = document.createElement('p');
      saldo.className = 'cuenta-saldo-monto';
      saldo.textContent = saldosVisibles ? new Intl.NumberFormat('es-SV', { style: 'currency', currency: cuenta.moneda }).format(cuenta.saldo) + ` ${cuenta.moneda}` : '••••••';
      const etiqueta = document.createElement('p');
      etiqueta.className = 'cuenta-saldo-label';
      etiqueta.textContent = 'Saldo disponible';
      card.appendChild(numero);
      card.appendChild(nombre);
      card.appendChild(saldo);
      card.appendChild(etiqueta);
      cuentasCarousel.appendChild(card);
    }
  }

  function mostrarDatos(data) {
    cuentas = data.cuentas;
    get('greeting-title').textContent = `Hola, ${data.perfil.nombre}`;
    get('greeting-perfil').textContent = `Perfil ${data.perfil.id} · ${cardName(data.perfil)}`;
    get('tarjeta-tipo').textContent = cardShortName(data.perfil);
    cargado = true;
    renderizarCuentas();
    contenido.hidden = false;
    cargando.hidden = true;
    errorBox.hidden = true;
    habilitarPromociones(true);
  }

  async function cargarMenu() {
    contenido.hidden = true;
    errorBox.hidden = true;
    cargando.hidden = false;
    habilitarPromociones(false);
    try {
      if (!await requireSession()) return;
      const data = await consultarMenu();
      if (data) mostrarDatos(data);
    } catch { mostrarError(); }
  }

  async function abrirPromociones() {
    if (!cargado) return;
    habilitarPromociones(false);
    try {
      // Se decide al pulsar Promociones, no al iniciar sesión ni por una pista local.
      const data = await consultarMenu();
      if (data) {
        mostrarDatos(data);
        location.assign(data.destinoPromociones);
      }
    } catch { mostrarError(); }
  }

  get('btn-reintentar').addEventListener('click', cargarMenu);
  get('btn-eye-toggle').addEventListener('click', () => {
    saldosVisibles = !saldosVisibles;
    get('btn-eye-toggle').setAttribute('aria-pressed', String(!saldosVisibles));
    renderizarCuentas();
  });
  btnVerTodas.addEventListener('click', () => {
    vistaExpandida = !vistaExpandida;
    btnVerTodas.textContent = vistaExpandida ? 'Ver menos' : 'Ver todas';
    btnVerTodas.setAttribute('aria-expanded', String(vistaExpandida));
    renderizarCuentas();
  });
  btnMisTarjetas.addEventListener('click', () => {
    soloTarjetas = !soloTarjetas;
    btnMisTarjetas.setAttribute('aria-pressed', String(soloTarjetas));
    renderizarCuentas();
  });
  get('btn-nav-inicio').addEventListener('click', () => {
    soloTarjetas = false;
    btnMisTarjetas.setAttribute('aria-pressed', 'false');
    renderizarCuentas();
  });
  btnPromociones.addEventListener('click', abrirPromociones);
  btnParaTi.addEventListener('click', abrirPromociones);
  btnLogout.addEventListener('click', async () => {
    alertaLogout.hidden = true;
    btnLogout.disabled = true;
    try {
      await logout();
      location.replace('/index.html');
    } catch {
      alertaLogout.textContent = 'No se pudo cerrar la sesión. Intenta de nuevo.';
      alertaLogout.hidden = false;
    } finally { btnLogout.disabled = false; }
  });
  await cargarMenu();
});
