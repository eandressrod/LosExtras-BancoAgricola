import { requireSession, forgetLogin } from './comun.js';

document.addEventListener('DOMContentLoaded', async () => {
  const greetingTitle = document.getElementById('greeting-title');
  const greetingVisita = document.getElementById('greeting-visita');
  const cuentasCarousel = document.getElementById('cuentas-carousel');
  const btnPromociones = document.getElementById('btn-promociones');
  const btnTabParaTi = document.getElementById('btn-tab-parati');
  const btnLogout = document.getElementById('btn-logout');
  const alertaLogout = document.getElementById('alerta-logout');
  const btnEyeToggle = document.getElementById('btn-eye-toggle');
  const btnMisTarjetas = document.getElementById('btn-mis-tarjetas');
  const linkVerTodas = document.querySelector('.link-ver-todas');

  let saldosVisibles = true;
  let destinoPromocionesUrl = '/encuesta.html';
  let cuentasData = [];
  let perfilActual = null;
  let vistaExpandida = false;

  try {
    const perfil = await requireSession();
    if (!perfil) return;
    perfilActual = perfil;

    greetingTitle.innerHTML = `Hola ${perfil.nombre || perfil.usuario || 'Usuario'} <span class="arrow">&gt;</span>`;
    
    const ahora = new Date();
    const fechaStr = ahora.toLocaleDateString('es-SV', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const horaStr = ahora.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit', hour12: false });
    greetingVisita.textContent = `Última visita: ${fechaStr} | ${horaStr}`;

    const res = await fetch('/api/menu');
    if (!res.ok) throw new Error('No se pudo cargar el menú');

    const data = await res.json();
    cuentasData = data.cuentas || [];
    destinoPromocionesUrl = data.destinoPromociones || '/encuesta.html';

    if (btnMisTarjetas) {
      const tipoT = (perfil.tipoTarjeta || 'Básica').toUpperCase();
      btnMisTarjetas.querySelector('.tarjetas-entry-left span').textContent = `Mis Tarjetas (${tipoT})`;
    }

    renderizarCuentas();
  } catch (err) {
    cuentasCarousel.innerHTML = `
      <div class="cuenta-item-card">
        <p style="color: #ef4444; margin: 0;">Error al cargar tus cuentas. <button id="btn-reintentar" style="background: none; border: underline; color: #002f6c; cursor: pointer;">Reintentar</button></p>
      </div>
    `;
    const btnReintentar = document.getElementById('btn-reintentar');
    if (btnReintentar) btnReintentar.addEventListener('click', () => location.reload());
  }

  function renderizarCuentas(soloTarjetas = false) {
    cuentasCarousel.innerHTML = '';
    const lista = soloTarjetas 
      ? cuentasData.filter(c => c.tipo.toLowerCase().includes('tarjeta') || c.tipo.toLowerCase().includes('crédito'))
      : cuentasData;

    if (lista.length === 0) {
      cuentasCarousel.innerHTML = `
        <div class="cuenta-item-card">
          <p style="color: #6b7280; margin: 0;">${soloTarjetas ? 'No tienes tarjetas activas asociadas.' : 'No tienes cuentas registradas.'}</p>
        </div>
      `;
      return;
    }

    cuentasCarousel.style.flexWrap = vistaExpandida ? 'wrap' : 'nowrap';

    lista.forEach(c => {
      const card = document.createElement('div');
      card.className = 'cuenta-item-card';

      const partes = Number(c.saldo).toFixed(2).split('.');
      const enteros = partes[0];
      const centavos = partes[1];
      const saldoTexto = saldosVisibles ? `$${enteros}<sup>${centavos}</sup>` : '••••••';

      card.innerHTML = `
        <div class="cuenta-item-top">
          <span>${c.numeroEnmascarado} ${c.tipo}</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
        </div>
        <div class="cuenta-item-subtitle">${c.nombre}</div>
        <div class="cuenta-saldo-wrapper">
          <div class="cuenta-saldo-monto">${saldoTexto}</div>
          <div class="cuenta-saldo-label">Saldo disponible</div>
        </div>
      `;
      cuentasCarousel.appendChild(card);
    });
  }

  // Ocultar/mostrar saldos
  btnEyeToggle.addEventListener('click', () => {
    saldosVisibles = !saldosVisibles;
    renderizarCuentas();
  });

  // «Ver todas» alterna vista
  if (linkVerTodas) {
    linkVerTodas.addEventListener('click', (e) => {
      e.preventDefault();
      vistaExpandida = !vistaExpandida;
      linkVerTodas.textContent = vistaExpandida ? 'Ver menos <' : 'Ver todas >';
      renderizarCuentas();
    });
  }

  // «Mis Tarjetas» filtra tarjetas del usuario
  if (btnMisTarjetas) {
    let filtrandoTarjetas = false;
    btnMisTarjetas.addEventListener('click', () => {
      filtrandoTarjetas = !filtrandoTarjetas;
      renderizarCuentas(filtrandoTarjetas);
    });
  }

  // Navegación hacia Promociones evaluando estado de encuesta
  const navegarPromociones = () => { window.location.href = destinoPromocionesUrl; };
  if (btnPromociones) btnPromociones.addEventListener('click', navegarPromociones);
  if (btnTabParaTi) btnTabParaTi.addEventListener('click', navegarPromociones);

  // Logout con error visible si falla
  btnLogout.addEventListener('click', async () => {
    alertaLogout.style.display = 'none';
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' });
      if (!res.ok) throw new Error('Fallo al cerrar sesión en el servidor');
      forgetLogin();
      window.location.href = '/index.html';
    } catch (err) {
      alertaLogout.style.display = 'block';
    }
  });

  // Notificación en botones fuera de alcance
  const botonesSinAlcance = document.querySelectorAll('.action-circle-item, .action-btn-header[aria-label="Mensajería"], .floating-qr-btn');
  botonesSinAlcance.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      alert('Esta función no forma parte del alcance de la versión actual.');
    });
  });
});
