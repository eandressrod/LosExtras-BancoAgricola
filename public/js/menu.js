import { requireSession, forgetLogin, cardName } from './comun.js';

document.addEventListener('DOMContentLoaded', async () => {
  const cargando = document.getElementById('estado-cargando');
  const errorBox = document.getElementById('estado-error');
  const errorTexto = document.getElementById('error-texto');
  const btnReintentar = document.getElementById('btn-reintentar');
  const contenido = document.getElementById('contenido-menu');

  const usuarioNombre = document.getElementById('usuario-nombre');
  const badgeTarjeta = document.getElementById('badge-tarjeta');
  const cuentasList = document.getElementById('cuentas-list');
  const cuentasVacias = document.getElementById('cuentas-vacias');

  const btnPromociones = document.getElementById('btn-promociones');
  const btnLogout = document.getElementById('btn-logout');

  let destinoPromocionesUrl = '/encuesta.html';

  async function cargarMenu() {
    cargando.style.display = 'block';
    errorBox.style.display = 'none';
    contenido.style.display = 'none';

    try {
      // 1. Proteger la página mediante la función estándar del proyecto
      const perfil = await requireSession();
      if (!perfil) return; // requireSession redirige a index.html si no hay sesión

      // 2. Consultar datos y cuentas
      const res = await fetch('/api/menu');
      if (!res.ok) {
        throw new Error('No se pudo consultar el menú. Código ' + res.status);
      }

      const data = await res.json();
      mostrarDatos(data);
    } catch (err) {
      cargando.style.display = 'none';
      errorBox.style.display = 'block';
      errorTexto.textContent = err.message || 'Error al cargar la información del menú.';
    }
  }

  function mostrarDatos(data) {
    const { perfil, cuentas, destinoPromociones } = data;
    destinoPromocionesUrl = destinoPromociones || '/encuesta.html';

    usuarioNombre.textContent = `Hola, ${perfil.nombre || perfil.usuario || 'Cliente'}`;
    const tipo = (perfil.tipoTarjeta || 'basica').toLowerCase();
    badgeTarjeta.textContent = cardName(perfil);
    if (tipo === 'black') {
      badgeTarjeta.classList.add('badge-black');
    }

    cuentasList.innerHTML = '';
    if (!cuentas || cuentas.length === 0) {
      cuentasVacias.style.display = 'block';
    } else {
      cuentasVacias.style.display = 'none';
      cuentas.forEach(cuenta => {
        const card = document.createElement('div');
        card.className = 'cuenta-card';
        card.innerHTML = `
          <div class="cuenta-header">
            <span class="cuenta-nombre">${cuenta.nombre}</span>
            <span class="cuenta-numero">${cuenta.numeroEnmascarado}</span>
          </div>
          <div class="cuenta-tipo" style="font-size: 0.8rem; color: #64748b;">${cuenta.tipo} · ${cuenta.segmento || ''}</div>
          <div class="cuenta-saldo">${cuenta.moneda} $${Number(cuenta.saldo).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        `;
        cuentasList.appendChild(card);
      });
    }

    cargando.style.display = 'none';
    contenido.style.display = 'block';
  }

  btnPromociones.addEventListener('click', () => {
    window.location.href = destinoPromocionesUrl;
  });

  btnLogout.addEventListener('click', async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Error al llamar logout:', e);
    } finally {
      forgetLogin();
      window.location.href = '/index.html';
    }
  });

  btnReintentar.addEventListener('click', cargarMenu);

  cargarMenu();
});
