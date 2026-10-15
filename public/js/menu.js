import { requireSession, forgetLogin, logout, cardName, getJSON } from './comun.js';
import { compartirCuenta, partesSaldo, referenciaCuenta } from './menu-modelo.js';
import { animarEntradaMenu } from './transiciones.js';

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
  let metas = [];
  let lecturaMetas = 0;
  let lecturaDialogo = 0;

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
  function modal(titulo) {
    lecturaDialogo++;
    get('dialog-title').textContent = titulo;
    dialogBody.replaceChildren(); mensaje('');
    get('btn-logout').hidden = true; get('alerta-logout').hidden = true;
    get('btn-ver-todas').hidden = true;
    if (!dialog.open) dialog.showModal();
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
    datos = null; metas = []; lecturaMetas++; lecturaDialogo++;
    lista.replaceChildren(); dialogBody.replaceChildren(); dialog.close(); encabezado();
    get('menu-content').hidden = true; get('menu-loading').hidden = true;
    get('menu-error-text').textContent = error.message || 'No se pudieron cargar los datos del menú. Intenta de nuevo.';
    get('menu-error').hidden = false; controles(false);
  }
  async function cargarMenu() {
    get('menu-content').hidden = true; get('menu-error').hidden = true; get('menu-loading').hidden = false; controles(false);
    try {
      await animarEntradaMenu(document.querySelector('.app-wrapper'));
      perfil = await requireSession();
      if (!perfil) return;
      get('btn-perfil').disabled = false;
      datos = await getJSON('/api/menu'); encabezado(); controles(true);
      get('menu-loading').hidden = true; get('menu-content').hidden = false;
      await cambiarPestana(pestana);
    } catch (error) { mostrarError(error); }
  }
  function tarjetaCuenta(cuenta) {
    const referencia = referenciaCuenta(cuenta);
    const card = elemento('article', 'product-card account-product');
    card.appendChild(imagen('cerdito_ahorro', 'account-icon'));
    card.appendChild(elemento('h3', '', `${referencia} ${cuenta.tipo}`));
    card.appendChild(elemento('p', 'product-subtitle', cuenta.nombre));
    card.appendChild(saldo(cuenta));
    card.appendChild(elemento('p', 'balance-label', 'Saldo disponible · ' + cuenta.moneda));
    const footer = elemento('div', 'account-footer');
    footer.appendChild(elemento('span', '', 'N.º ' + referencia));
    if (cuenta.numeroCompleto && !/tarjeta/i.test(cuenta.tipo)) {
      const share = boton('Compartir número', () => abrirCompartir(cuenta), 'share-account');
      share.appendChild(imagen('compartir')); footer.appendChild(share);
    }
    card.appendChild(footer);
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
    card.appendChild(elemento('p', 'balance-label', 'Saldo disponible · ' + tarjeta.moneda));
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
    pestana = valor; lecturaMetas++;
    tabs.forEach((tab, i) => { const activa = ['cuentas','tarjetas','metas'][i] === valor; tab.setAttribute('aria-selected', String(activa)); tab.tabIndex = activa ? 0 : -1; });
    get('panel-productos').setAttribute('aria-labelledby', tabs[['cuentas','tarjetas','metas'].indexOf(valor)].id);
    if (valor === 'metas') await cargarMetas(); else pintarProductos();
  }
  async function cargarMetas() {
    const lectura = ++lecturaMetas;
    lista.replaceChildren(indicadorCarga());
    try { const filas = await getJSON('/api/metas'); if (lectura !== lecturaMetas) return; metas = filas; pintarMetas(); }
    catch (error) { if (lectura !== lecturaMetas) return; lista.replaceChildren(elemento('p','menu-state',error.message), boton('Reintentar',cargarMetas,'meta-action')); }
  }
  function pintarMetas() {
    lista.replaceChildren();
    if (!metas.length) lista.appendChild(elemento('p','menu-empty','No tienes metas registradas.'));
    for (const meta of metas) {
      const card = elemento('article','product-card meta-card'); card.appendChild(elemento('h3','',meta.nombre));
      const formato = new Intl.NumberFormat('es-SV',{ style:'currency',currency:meta.moneda });
      card.appendChild(elemento('p','product-subtitle',`${formato.format(meta.ahorrado)} de ${formato.format(meta.objetivo)}`));
      const progress = elemento('progress'); progress.max = meta.objetivo; progress.value = meta.ahorrado; progress.setAttribute('aria-label', meta.nombre); card.appendChild(progress);
      card.appendChild(elemento('p','balance-label', Math.round(meta.ahorrado / meta.objetivo * 100) + ' %'));
      const actions = elemento('div','meta-buttons'); actions.appendChild(boton('Editar',()=>formularioMeta(meta),'meta-action')); actions.appendChild(boton('Eliminar',()=>confirmarEliminar(meta),'meta-action')); card.appendChild(actions); lista.appendChild(card);
    }
    lista.appendChild(boton('Crear meta',()=>formularioMeta(),'meta-action'));
  }
  async function escribir(url, method, cuerpo) {
    const res = await fetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(cuerpo) });
    if (res.status === 401) { forgetLogin(); location.replace('/index.html'); throw new Error('Inicia sesión para continuar.'); }
    if (!res.ok) { const data = await res.json().catch(()=>null); throw new Error(data?.error || 'No se pudo guardar. Intenta de nuevo.'); }
    return res.status === 204 ? null : res.json();
  }
  function formularioMeta(meta = null) {
    modal(meta ? 'Editar meta' : 'Crear meta');
    const form = elemento('form','meta-form'); const inputs = {};
    for (const [nombre, etiqueta, type] of [['nombre','Nombre','text'],['objetivo','Objetivo (USD)','number'],['ahorrado','Ahorro registrado (USD)','number']]) {
      const label = elemento('label','',etiqueta); const input = elemento('input'); input.name = nombre; input.type = type; input.required = true;
      input.value = meta?.[nombre] ?? (nombre === 'ahorrado' ? 0 : '');
      if (type === 'number') { input.min = nombre === 'objetivo' ? '0.01' : '0'; input.step = '0.01'; } else input.maxLength = 60;
      label.appendChild(input); form.appendChild(label); inputs[nombre] = input;
    }
    const save = elemento('button','','Guardar'); save.type = 'submit'; form.appendChild(save);
    form.addEventListener('submit', async event => {
      event.preventDefault(); save.disabled = true; mensaje('');
      try {
        await escribir('/api/metas', meta ? 'PATCH' : 'POST', { ...(meta ? {id:meta.id} : {}), nombre:inputs.nombre.value, objetivo:Number(inputs.objetivo.value), ahorrado:Number(inputs.ahorrado.value) });
        dialog.close(); await cambiarPestana('metas');
      } catch (error) { errorDialogo(error); } finally { save.disabled = false; }
    });
    dialogBody.appendChild(form);
  }
  function confirmarEliminar(meta) {
    modal('Eliminar meta'); dialogBody.appendChild(elemento('p','',meta.nombre));
    const remove = boton('Eliminar',async()=>{ remove.disabled = true; try { await escribir('/api/metas','DELETE',{id:meta.id}); dialog.close(); await cambiarPestana('metas'); } catch(error) { errorDialogo(error); } finally { remove.disabled = false; } });
    dialogBody.appendChild(remove); dialogBody.appendChild(boton('Cancelar',()=>dialog.close()));
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
    modal('Mensajería'); const lectura = lecturaDialogo;
    dialogBody.appendChild(indicadorCarga());
    try {
      const mensajes = await getJSON('/api/mensajes'); if (lectura !== lecturaDialogo || !dialog.open) return;
      dialogBody.replaceChildren();
      if (!mensajes.length) dialogBody.appendChild(elemento('p','','No tienes mensajes.'));
      for (const m of mensajes) {
        const btn = boton('',async()=>{ btn.disabled = true; try {
          const actualizado = await escribir('/api/mensajes','PATCH',{id:m.id});
          if (lectura !== lecturaDialogo || !dialog.open) return;
          if (!m.leido && datos) { datos.mensajesPendientes = Math.max(0,datos.mensajesPendientes-1); encabezado(); }
          Object.assign(m,actualizado); modal(m.titulo); dialogBody.appendChild(elemento('p','',m.texto)); dialogBody.appendChild(boton('Volver',abrirMensajes));
        } catch(error) { if (lectura === lecturaDialogo && dialog.open) errorDialogo(error); } finally { btn.disabled = false; } },'dialog-row');
        btn.appendChild(elemento('strong','',m.titulo)); btn.appendChild(elemento('span','',m.leido ? 'Leído' : 'Sin leer')); dialogBody.appendChild(btn);
      }
    } catch(error) { if (lectura === lecturaDialogo && dialog.open) errorDialogo(error,abrirMensajes); }
  }
  function abrirPerfil() {
    if (!perfil) return; modal('Perfil');
    dialogBody.appendChild(elemento('p','',perfil.nombre)); dialogBody.appendChild(elemento('p','',cardName(perfil)));
    get('btn-logout').hidden = false;
  }
  function abrirDisponibles() {
    if (!datos) return; modal('Productos disponibles');
    for (const producto of datos.productosDisponibles ?? []) {
      const nombre = `${producto.nombre} · ${producto.modalidad} ${producto.red}`;
      dialogBody.appendChild(boton(nombre, () => {
        modal(nombre);
        dialogBody.appendChild(elemento('p', '', producto.descripcion));
        dialogBody.appendChild(boton('Volver', abrirDisponibles));
      }, 'dialog-row'));
    }
    if (!datos.productosDisponibles?.length) dialogBody.appendChild(elemento('p','','No hay productos disponibles.'));
  }
  function abrirGestiones() {
    if (!datos) return; modal('Gestiones');
    get('btn-ver-todas').hidden = !datos.cuentas.length;
    dialogBody.appendChild(boton(saldosVisibles ? 'Ocultar saldos' : 'Mostrar saldos',()=>{ saldosVisibles = !saldosVisibles; if(pestana !== 'metas') pintarProductos(); abrirGestiones(); },'dialog-row'));
    dialogBody.appendChild(boton('Compartir cuenta',()=>{ modal('Compartir cuenta'); for(const cuenta of datos.cuentas) dialogBody.appendChild(boton(cuenta.nombre + ' ' + cuenta.numeroEnmascarado,()=>abrirCompartir(cuenta),'dialog-row')); if(!datos.cuentas.length) dialogBody.appendChild(elemento('p','','No tienes cuentas registradas.')); },'dialog-row'));
    dialogBody.appendChild(boton('Administrar metas',()=>{ dialog.close(); cambiarPestana('metas'); },'dialog-row'));
  }
  get('dialog-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{ lecturaDialogo++; });
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
