import { requireSession, volverAlLogin, logout, cardName, getJSON, revelarPagina } from './comun.js';
import { compartirCuenta, partesSaldo, referenciaCuenta, fechaMensaje } from './menu-modelo.js';
import { animarEntradaMenu, animarPantalla, regresarEnVentana } from './transiciones.js';
import { conMinimoCarga } from './carga-tiempo.js';

document.addEventListener('DOMContentLoaded', async () => {
  const get = id => document.getElementById(id);
  const lista = get('productos-lista');
  const dialog = get('menu-dialog');
  const dialogBody = get('dialog-body');
  const alert = get('dialog-alert');
  const tabs = [get('tab-cuentas'), get('btn-mis-tarjetas'), get('tab-metas')];
  let datos = null;
  let perfil = null;
  let pestana = 'cuentas';
  let saldosVisibles = true;
  let lecturaDialogo = 0;
  let controlDialogo;
  let regresando = false;
  let volviendoDialogo = false;

  function elemento(tag, clase, texto) {
    const el = document.createElement(tag);
    if (clase) el.className = clase;
    if (texto !== undefined) el.textContent = texto;
    return el;
  }
  function imagen(nombre, clase = '') {
    const img = elemento('img', clase);
    img.src = `/recursos/menu/${nombre}.svg`; img.alt = '';
    return img;
  }
  function indicadorCarga() {
    const indicador = elemento('div', 'module-loading');
    indicador.setAttribute('role', 'status');
    indicador.appendChild(imagen('carga', 'loading-ring'));
    indicador.appendChild(elemento('span', '', 'CARGANDO...'));
    return indicador;
  }
  function boton(texto, accion, clase = '') {
    const btn = elemento('button', clase, texto);
    btn.type = 'button'; btn.addEventListener('click', accion); return btn;
  }
  function mensaje(texto) { alert.textContent = texto; alert.hidden = !texto; }
  function modal(titulo, lectura = false, vista = '') {
    dialog.dataset.vista = vista;
    get('dialog-back').setAttribute('aria-label', vista === 'mensaje' ? 'Volver a la bandeja de entrada' : 'Volver al menú');
    document.body.dataset.lecturaMensaje = String(lectura);
    lecturaDialogo++;
    get('dialog-title').textContent = titulo;
    dialogBody.replaceChildren(); mensaje('');
    get('btn-logout').hidden = true; get('alerta-logout').hidden = true;
    get('btn-ver-todas').hidden = true;
    if (!dialog.open) {
      controlDialogo = document.activeElement;
      dialog.showModal();
    }
    if (vista) {
      dialog.scrollTop = 0;
      get('dialog-back').focus({ preventScroll:true });
      if (!regresando) animarPantalla(dialog);
    }
  }
  function errorDialogo(error, reintentar) {
    mensaje(error.message);
    if (reintentar) dialogBody.replaceChildren(boton('Reintentar', reintentar));
  }
  function saldo(producto) {
    const partes = partesSaldo(producto, saldosVisibles);
    const monto = elemento('p', 'product-balance');
    monto.appendChild(elemento('span', '', partes.entero));
    if (partes.centavos) monto.appendChild(elemento('sup', '', partes.centavos));
    return monto;
  }
  function encabezado() {
    const pendientes = datos?.mensajesPendientes ?? 0;
    get('mensajes-contador').textContent = String(pendientes);
    get('mensajes-contador').hidden = !pendientes;
  }
  function controles(habilitados) {
    for (const id of ['btn-mensajeria','btn-disponibles','btn-promociones','btn-nav-gestiones','btn-nav-productos','btn-nav-inicio', ...tabs.map(t => t.id)]) get(id).disabled = !habilitados;
  }
  function mostrarError(error) {
    document.documentElement?.removeAttribute('data-entrada-menu');
    datos = null; lecturaDialogo++;
    lista.replaceChildren(); dialogBody.replaceChildren(); dialog.close(); encabezado();
    get('menu-content').hidden = true; get('menu-loading').hidden = true;
    get('menu-error-text').textContent = error.message || 'No se pudieron cargar los datos del menú. Intenta de nuevo.';
    get('menu-error').hidden = false; controles(false);
  }
  async function cargarMenu() {
    get('menu-content').hidden = true; get('menu-error').hidden = true; get('menu-loading').hidden = false; controles(false);
    try {
      perfil = await requireSession({ revelar:false });
      if (!perfil) return;
      // La cubierta de acceso permanece inmóvil mientras se preparan los datos.
      if (!document.documentElement?.dataset.entradaMenu) revelarPagina();
      get('btn-perfil').disabled = false;
      datos = await conMinimoCarga(() => getJSON('/api/menu'));
      // Compatibilidad con respuestas anteriores: Cuentas nunca presenta tarjetas.
      datos.cuentas = datos.cuentas.filter(cuenta => !/tarjeta/i.test(cuenta.tipo));
      encabezado(); controles(true);
      get('menu-loading').hidden = true; get('menu-content').hidden = false;
      await cambiarPestana(pestana);
      await animarEntradaMenu(document.querySelector('.app-wrapper'), { cubierta:get(document.documentElement?.dataset.entradaMenu==='fade'?'menu-resume-loading':'menu-entry-loading'), revelar:() => {
        revelarPagina(); document.documentElement?.removeAttribute('data-entrada-menu');
      } });
    } catch (error) { mostrarError(error); }
  }
  function tarjetaCuenta(cuenta) {
    const referencia = referenciaCuenta(cuenta);
    const card = elemento('article', 'product-card account-product');
    card.appendChild(imagen('cerdito_ahorro', 'account-icon'));
    card.appendChild(elemento('h3', '', `${referencia} ${cuenta.tipo}`));
    card.appendChild(elemento('p', 'product-subtitle', cuenta.nombre));
    card.appendChild(saldo(cuenta));
    card.appendChild(elemento('p', 'balance-label', 'Saldo disponible'));
    const footer = elemento('div', 'account-footer');
    footer.appendChild(elemento('span', '', 'N.º ' + referencia));
    if (cuenta.numeroCompleto && !/tarjeta/i.test(cuenta.tipo)) {
      const share = boton('Compartir número', () => abrirCompartir(cuenta), 'share-account');
      share.appendChild(imagen('compartir')); footer.appendChild(share);
    }
    card.appendChild(footer);
    const toggle = boton('', () => {
      const abierta = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded',String(!abierta));
      cortina.setAttribute('aria-hidden',String(abierta));
      cortina.dataset.abierta = String(!abierta);
    },'account-toggle');
    toggle.setAttribute('aria-label',`Opciones de ${cuenta.tipo} ${referencia}`);
    toggle.setAttribute('aria-expanded','false');
    const cortina = elemento('div','account-curtain');
    cortina.id = 'opciones-' + cuenta.id;
    cortina.setAttribute('aria-hidden','true');
    toggle.setAttribute('aria-controls',cortina.id);
    const opciones = elemento('div','account-options');
    for (const [nombre,icono] of [['Transferir','transferir'],['Movimientos','movimientos'],['Ver más','mas']]) {
      const opcion = elemento('button','account-option'); opcion.type='button'; opcion.disabled=true;
      const circulo = elemento('span','account-option-icon');
      if (icono === 'mas') circulo.appendChild(elemento('span','','•••')); else circulo.appendChild(imagen(icono));
      opcion.appendChild(circulo);opcion.appendChild(elemento('span','',nombre));opciones.appendChild(opcion);
    }
    const resumen = elemento('div','account-summary');
    while (card.firstChild) resumen.appendChild(card.firstChild);
    cortina.appendChild(opciones); resumen.appendChild(toggle);card.appendChild(resumen);card.appendChild(cortina);
    return card;
  }
  function tarjetaProducto(tarjeta) {
    const card = elemento('article', 'product-card card-product');
    const heading = elemento('div', 'card-heading');
    const titulo = elemento('div');
    titulo.appendChild(elemento('h3', '', `${tarjeta.numeroEnmascarado} ${tarjeta.producto.nombre}`));
    titulo.appendChild(elemento('p', 'product-subtitle', 'Tarjeta de ' + tarjeta.producto.modalidad));
    const marca = elemento('div', 'card-brand');
    const logoRed = imagen(tarjeta.producto.red.toLowerCase());
    logoRed.alt = tarjeta.producto.red;
    marca.appendChild(logoRed);
    marca.appendChild(elemento('span', '', tarjeta.numeroEnmascarado));
    heading.appendChild(titulo); heading.appendChild(marca); card.appendChild(heading);
    card.appendChild(saldo(tarjeta));
    card.appendChild(elemento('p', 'balance-label', 'Saldo disponible'));
    card.appendChild(elemento('p', 'card-type', 'Tipo  ' + tarjeta.producto.nombre));
    return card;
  }
  function pintarProductos() {
    lista.replaceChildren(); if (!datos) return;
    if (pestana === 'cuentas') {
      if (!datos.cuentas.length) lista.appendChild(elemento('p','menu-empty','No tienes cuentas registradas.'));
      for (const cuenta of datos.cuentas) lista.appendChild(tarjetaCuenta(cuenta));
    } else if (pestana === 'tarjetas') {
      if (!datos.tarjetas?.length) lista.appendChild(elemento('p','menu-empty','No tienes tarjetas registradas.'));
      for (const tarjeta of datos.tarjetas ?? []) lista.appendChild(tarjetaProducto(tarjeta));
      const puntos = elemento('article','product-card points-card');
      puntos.appendChild(elemento('h3','','Puntos BA')); puntos.appendChild(elemento('p','product-subtitle','Puntos BA'));
      puntos.appendChild(elemento('p','product-balance', new Intl.NumberFormat('es-SV').format(datos.puntos ?? 0)));
      puntos.appendChild(elemento('p','balance-label','Puntos acumulados')); lista.appendChild(puntos);
    }
  }
  async function cambiarPestana(valor) {
    pestana = valor;
    tabs.forEach((tab, i) => { const activa = ['cuentas','tarjetas','metas'][i] === valor; tab.setAttribute('aria-selected', String(activa)); tab.tabIndex = activa ? 0 : -1; });
    get('panel-productos').setAttribute('aria-labelledby', tabs[['cuentas','tarjetas','metas'].indexOf(valor)].id);
    get('panel-productos').dataset.vista = valor;
    if (valor === 'metas') pintarMetas(); else pintarProductos();
  }
  function pintarMetas() {
    lista.replaceChildren();
    const contenido = elemento('section','goals-intro');
    contenido.appendChild(elemento('h2','','¡Cumple todas tus metas!'));
    contenido.appendChild(elemento('p','','¿Quieres ahorrar para cumplir metas importantes y no sabes cómo?'));
    contenido.appendChild(elemento('p','','Queremos ayudarte a lograr lo que te propongas, ahorrando de forma fácil y teniendo el control total de tu dinero.'));
    lista.appendChild(contenido);
  }
  async function escribir(url, method, cuerpo) {
    const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(cuerpo) });
    if (res.status === 401) { volverAlLogin(); throw new Error('Inicia sesión para continuar.'); }
    if (!res.ok) { const data = await res.json().catch(()=>null); throw new Error(data?.error || 'No se pudo guardar. Intenta de nuevo.'); }
    return res.status === 204 ? null : res.json();
  }
  function abrirCompartir(cuenta) {
    modal('Compartir número'); dialogBody.appendChild(elemento('p','',cuenta.nombre));
    dialogBody.appendChild(elemento('p','',cuenta.numeroCompleto || 'Número completo no disponible.'));
    if (!cuenta.numeroCompleto) return;
    const compartir = boton('Compartir',async()=>{ compartir.disabled = true; try { const estado = await compartirCuenta(cuenta); if (estado === 'copiado') mensaje('Número copiado.'); } catch(error) { errorDialogo(error); } finally { compartir.disabled = false; } });
    const copiar = boton('Copiar',async()=>{ copiar.disabled = true; try { await compartirCuenta(cuenta,{clipboard:navigator.clipboard}); mensaje('Número copiado.'); } catch(error) { errorDialogo(error); } finally { copiar.disabled = false; } });
    const actions = elemento('div','dialog-actions'); actions.appendChild(compartir); actions.appendChild(copiar); dialogBody.appendChild(actions);
  }
  async function abrirMensajes() {
    modal('Mensajería', true, 'entrada'); const lectura = lecturaDialogo;
    dialogBody.appendChild(indicadorCarga());
    try {
      const mensajes = await conMinimoCarga(() => getJSON('/api/mensajes')); if (lectura !== lecturaDialogo || !dialog.open) return;
      dialogBody.replaceChildren();
      if (!mensajes.length) dialogBody.appendChild(elemento('p','inbox-empty','No hay mensajes'));
      const listado = elemento('div','inbox-list');
      if (mensajes.length) dialogBody.appendChild(listado);
      for (const m of mensajes) {
        const btn = boton('',async()=>{ btn.disabled = true; try {
          const actualizado = await escribir('/api/mensajes','PATCH',{id:m.id});
          if (lectura !== lecturaDialogo || !dialog.open) return;
          if (!m.leido && datos) { datos.mensajesPendientes = Math.max(0,datos.mensajesPendientes-1); encabezado(); }
          Object.assign(m,actualizado); modal('Mensajería', true, 'mensaje');
          const articulo = elemento('article','message-detail');
          articulo.appendChild(elemento('h3','',m.titulo));
          const fecha = elemento('time','',fechaMensaje(m.fecha));
          if (fecha.textContent) { fecha.setAttribute('datetime',m.fecha); articulo.appendChild(fecha); }
          articulo.appendChild(elemento('p','message-text',m.texto)); dialogBody.appendChild(articulo);
        } catch(error) { if (lectura === lecturaDialogo && dialog.open) errorDialogo(error); } finally { btn.disabled = false; } },'inbox-row');
        btn.setAttribute('aria-label', `${m.titulo}, ${m.leido ? 'Leído' : 'Sin leer'}`);
        btn.dataset.leido = String(m.leido);
        btn.appendChild(elemento('span','inbox-subject',m.titulo));
        const fecha = elemento('time','inbox-date',fechaMensaje(m.fecha));
        if (fecha.textContent) { fecha.setAttribute('datetime',m.fecha); btn.appendChild(fecha); }
        const flecha = elemento('span','inbox-chevron'); flecha.setAttribute('aria-hidden','true'); btn.appendChild(flecha);
        listado.appendChild(btn);
      }
    } catch(error) { if (lectura === lecturaDialogo && dialog.open) errorDialogo(error,abrirMensajes); }
  }
  function abrirPerfil() {
    if (!perfil) return; modal('Perfil', false, 'perfil');
    dialogBody.appendChild(imagen('perfil','profile-avatar'));
    dialogBody.appendChild(elemento('p','profile-name',perfil.nombre)); dialogBody.appendChild(elemento('p','profile-card',cardName(perfil)));
    get('btn-logout').hidden = false;
  }
  function abrirDisponibles() {
    if (!datos) return;
    const panel = get('panel-disponibles');
    panel.hidden = !panel.hidden;
    get('btn-disponibles').setAttribute('aria-expanded',String(!panel.hidden));
  }
  function abrirGestiones() {
    if (!datos) return; modal('Gestiones');
    get('btn-ver-todas').hidden = !datos.cuentas.length;
    dialogBody.appendChild(boton(saldosVisibles ? 'Ocultar saldos' : 'Mostrar saldos',()=>{ saldosVisibles = !saldosVisibles; if(pestana !== 'metas') pintarProductos(); abrirGestiones(); },'dialog-row'));
    dialogBody.appendChild(boton('Compartir cuenta',()=>{ modal('Compartir cuenta'); for(const cuenta of datos.cuentas) dialogBody.appendChild(boton(cuenta.nombre + ' ' + cuenta.numeroEnmascarado,()=>abrirCompartir(cuenta),'dialog-row')); if(!datos.cuentas.length) dialogBody.appendChild(elemento('p','','No tienes cuentas registradas.')); },'dialog-row'));
  }
  get('dialog-close').addEventListener('click',()=>dialog.close());
  async function volverDialogo() {
    if (volviendoDialogo) return;
    volviendoDialogo = true;
    const recargarCuentas = dialog.dataset.vista === 'entrada';
    if (recargarCuentas) {
      get('menu-content').hidden = true; get('menu-loading').hidden = false; controles(false);
    }
    try {
      await regresarEnVentana(async () => {
        regresando = true;
        try { if (dialog.dataset.vista === 'mensaje') await abrirMensajes(); else dialog.close(); }
        finally { regresando = false; }
      });
      if (recargarCuentas) {
        await conMinimoCarga(async () => cambiarPestana('cuentas'));
        get('panel-productos').scrollTop = 0;
        get('menu-loading').hidden = true; get('menu-content').hidden = false; controles(true);
      }
    } finally { volviendoDialogo = false; }
  }
  get('dialog-back').addEventListener('click',volverDialogo);
  dialog.addEventListener('cancel',event=>{ if (dialog.dataset.vista) { event.preventDefault(); volverDialogo(); } });
  dialog.addEventListener('close',()=>{
    lecturaDialogo++;
    document.body.dataset.lecturaMensaje = 'false';
    if (controlDialogo?.isConnected) controlDialogo.focus({ preventScroll:true });
  });
  get('btn-reintentar').addEventListener('click',cargarMenu);
  tabs.forEach((tab,i)=>{
    tab.addEventListener('click',()=>cambiarPestana(['cuentas','tarjetas','metas'][i]));
    tab.addEventListener('keydown',event=>{ const move = {ArrowRight:1,ArrowLeft:-1}; let indice = i; if (event.key in move) indice = (i+move[event.key]+3)%3; else if(event.key==='Home') indice = 0; else if(event.key==='End') indice = 2; else return; event.preventDefault(); tabs[indice].focus(); cambiarPestana(['cuentas','tarjetas','metas'][indice]); });
  });
  get('btn-nav-inicio').addEventListener('click',()=>cambiarPestana('cuentas'));
  get('btn-nav-productos').addEventListener('click',()=>cambiarPestana(pestana));
  get('btn-nav-gestiones').addEventListener('click',abrirGestiones);
  get('btn-promociones').addEventListener('click',()=>{ if (datos) location.assign('/promociones.html?entrada=menu'); });
  get('btn-mensajeria').addEventListener('click',abrirMensajes);
  get('btn-perfil').addEventListener('click',abrirPerfil);
  get('btn-disponibles').addEventListener('click',abrirDisponibles);
  get('btn-ver-todas').addEventListener('click',()=>{ if (!datos) return; modal('Todas mis cuentas'); for(const cuenta of datos.cuentas) dialogBody.appendChild(tarjetaCuenta(cuenta)); });
  get('btn-logout').addEventListener('click',async()=>{
    get('alerta-logout').hidden = true; get('btn-logout').disabled = true;
    try { await logout(); location.replace('/index.html'); }
    catch(error) { get('alerta-logout').textContent = error.message; get('alerta-logout').hidden = false; }
    finally { get('btn-logout').disabled = false; }
  });
  await cargarMenu();
});
