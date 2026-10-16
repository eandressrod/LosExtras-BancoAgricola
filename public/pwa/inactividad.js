import { estadoInactividad, plazoLocal, avisoDiscreto, leerSegundoPlano, registrarSegundoPlano, limpiarSegundoPlano, vencioSegundoPlano } from './inactividad-modelo.js';
import { conMinimoCarga } from '../js/carga-tiempo.js';
import { retirarCarga } from '../js/transiciones.js';

const CLAVE = 'bancoagricola-sesion-evento';
let sesion;
let plazo = 0;
let iniciada = false;
let finalizada = false;
let peticion = false;
let siguienteEnvio = 0;
let envioPendiente;
let dialogo;
let cuenta;
let mensaje;
let continuar;
let cubierta;
let canal;
let verificando = false;
let aviso;
let cuentaDiscreta;
let mensajeDiscreto;
let versionCubierta = 0;
let ocultaDesde = null;

function ocultarAviso() {
  aviso?.hidePopover?.();
  if (aviso) aviso.hidden = true;
}
function mostrarMensaje(texto) {
  mensaje.textContent = texto;
  mensajeDiscreto.textContent = texto;
}

function publicar(tipo) {
  const evento = { tipo, sesion, plazo, instante: Date.now(), nonce: Math.random() };
  canal?.postMessage(evento);
  try { localStorage.setItem(CLAVE, JSON.stringify(evento)); } catch { /* Sin almacenamiento, se valida igualmente en backend. */ }
}

export function actualizarSesion(estado, compartir = true) {
  if (!estado || finalizada || (sesion?.id === estado.id && estado.ahora < sesion.ahora)) return;
  sesion = estado;
  plazo = plazoLocal(estado);
  if (compartir) publicar('actividad');
  if (iniciada && !verificando) revisar();
}

function bloquear(texto = 'Verificando sesión…', reintentar = false) {
  versionCubierta++;
  crearCubierta();
  if (dialogo?.open) dialogo.close();
  ocultarAviso();
  if (reintentar) document.documentElement.removeAttribute('data-arranque');
  else document.documentElement.setAttribute('data-arranque', 'pending');
  document.documentElement.setAttribute('data-pwa-bloqueada', '');
  cubierta.replaceChildren();
  const contenido = document.createElement('div');
  if (!reintentar) {
    contenido.className = 'bank-loading-screen';
    for (const [clase,archivo] of [['startup-brand','marca'],['startup-stroke startup-yellow','arco-amarillo'],['startup-stroke startup-left','arco-izquierdo'],['startup-stroke startup-purple','arco-morado'],['startup-stroke startup-right','arco-derecho']]) {
      const imagen = document.createElement('img');imagen.className=clase;imagen.src=`/recursos/inicio/${archivo}.png`;imagen.alt=archivo==='marca'?'Bancoagrícola':'';contenido.append(imagen);
    }
    const indicador=document.createElement('div');indicador.className='bank-loading-indicator';
    const aro=document.createElement('img');aro.className='loading-ring';aro.src='/recursos/menu/carga.svg';aro.alt='';
    const etiqueta=document.createElement('span');etiqueta.textContent='CARGANDO...';indicador.append(aro,etiqueta);contenido.append(indicador);
    cubierta.append(contenido);cubierta.hidden=false;
    if (!cubierta.open) cubierta.showModal();
    return;
  }
  const p = document.createElement('p'); p.textContent = texto; contenido.append(p);
  if (reintentar) {
    const boton = document.createElement('button'); boton.type = 'button'; boton.textContent = 'Reintentar';
    boton.addEventListener('click', verificar); contenido.append(boton);
  }
  cubierta.append(contenido); cubierta.hidden = false;
  if (!cubierta.open) cubierta.showModal();
}
async function desbloquear(version) {
  const vigente = () => version === versionCubierta && !document.hidden && !finalizada;
  document.documentElement.removeAttribute('data-arranque');
  document.documentElement.removeAttribute('aria-busy');
  document.documentElement.removeAttribute('data-pwa-bloqueada');
  await retirarCarga(cubierta, { vigente });
  if (vigente()) cubierta.close();
}

function terminar(motivo = 'inactividad', compartir = true) {
  if (finalizada) return;
  finalizada = true;
  clearTimeout(envioPendiente);
  bloquear('Tu sesión terminó.');
  document.documentElement.setAttribute('data-salida-sesion','');
  try { sessionStorage.setItem('bancoagricola-motivo-salida', motivo); localStorage.removeItem('los-extras-sesion-iniciada'); } catch { /* Cookie validada en backend. */ }
  if (compartir) publicar('cierre');
  // No dependemos de esta petición para impedir acceso: el backend comprueba el plazo.
  if (motivo === 'inactividad') fetch('/api/auth/logout', { method: 'POST', keepalive: true }).then(res=>{
    if(res.ok) limpiarSegundoPlano(sesion?.id,localStorage);
  }).catch(() => {});
  setTimeout(() => location.replace('/index.html'),1000);
}

export function expirarSesion() { terminar(); }

function crearCubierta() {
  if (cubierta) return;
  cubierta = document.createElement('dialog'); cubierta.className = 'pwa-privacidad'; cubierta.hidden = true;
  cubierta.addEventListener('cancel', event => event.preventDefault());
  cubierta.setAttribute('role', 'status'); document.body.append(cubierta);
}

async function cerrarVoluntariamente() {
  if (peticion || finalizada) return;
  peticion = true; continuar.disabled = true;
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error();
    terminar('cierre');
  } catch { mostrarMensaje('No se pudo cerrar la sesión. Revisa tu conexión e intenta de nuevo.'); }
  finally { peticion = false; continuar.disabled = false; }
}

function revisar() {
  if (!sesion || finalizada) return;
  if (vencioSegundoPlano(ocultaDesde,Date.now())) return terminar();
  const estado = estadoInactividad(plazo);
  if (estado.estado === 'vencida') return terminar();
  if (document.hidden || verificando) return;
  if (estado.estado === 'aviso') {
    if (avisoDiscreto(location.pathname, document.body.dataset?.lecturaMensaje === 'true')) {
      if (dialogo.open) dialogo.close();
      // Un botón fuera de un diálogo modal sería inerte aunque su popover fuese visible.
      const contenedor = document.querySelector?.('#menu-dialog[open]') || document.body;
      if (aviso.parentNode !== contenedor) contenedor.append(aviso);
      cuentaDiscreta.textContent = `${estado.segundos} s`;
      if (aviso.hidden) { aviso.hidden = false; aviso.showPopover?.(); }
    } else {
      ocultarAviso();
      cuenta.textContent = String(estado.segundos);
      if (!dialogo.open) { dialogo.showModal(); dialogo.focus?.({ preventScroll:true }); }
    }
  } else {
    if (dialogo.open) dialogo.close();
    ocultarAviso();
    mostrarMensaje('');
  }
}

async function renovar() {
  if (peticion || verificando || finalizada || document.hidden) return;
  if (Date.now() >= plazo) return terminar();
  peticion = true; continuar.disabled = true; siguienteEnvio = Date.now() + 1000;
  try {
    const response = await fetch('/api/auth/actividad', { method: 'POST', cache: 'no-store', keepalive: true });
    if (finalizada) return;
    if (response.status === 401) return terminar();
    if (!response.ok) throw new Error();
    const datos = await response.json();
    actualizarSesion(datos.sesion);
    mostrarMensaje('');
  } catch {
    mostrarMensaje('No se pudo continuar la sesión. Revisa tu conexión e intenta de nuevo.');
  } finally { peticion = false; continuar.disabled = false; }
}

function actividad(event) {
  if (!event.isTrusted || document.hidden || verificando || finalizada || dialogo.open || (aviso && !aviso.hidden)) return;
  if (Date.now() >= plazo) return terminar();
  clearTimeout(envioPendiente);
  const espera = Math.max(0, siguienteEnvio - Date.now());
  if (!espera) return renovar();
  envioPendiente = setTimeout(renovar, espera);
}

async function verificar() {
  if (verificando || finalizada || document.hidden) return;
  verificando = true;
  bloquear();
  const version = versionCubierta;
  let fallo = false;
  try {
    const response = await conMinimoCarga(() => fetch('/api/auth/sesion', { cache: 'no-store' }));
    if (finalizada || document.hidden || version !== versionCubierta) return;
    if (!response.ok) throw new Error();
    const datos = await response.json();
    if (!datos.perfil) return terminar();
    // Si se cambió de usuario en otra pestaña, recargar antes de revelar el perfil anterior.
    if (sesion && datos.sesion.id !== sesion.id) { location.reload(); return; }
    actualizarSesion(datos.sesion);
    await desbloquear(version);
  } catch {
    fallo = true;
    if (version === versionCubierta && !document.hidden) bloquear('No se pudo verificar tu sesión. Revisa tu conexión.', true);
  }
  finally {
    verificando = false; revisar();
    if (!fallo && !finalizada && !document.hidden && version !== versionCubierta) verificar();
  }
}

function recibir(evento) {
  if (!evento?.sesion || evento.sesion.id !== sesion?.id || finalizada) return;
  if (evento.tipo === 'cierre') return terminar('cierre', false);
  if (evento.tipo === 'actividad') {
    actualizarSesion(evento.sesion, false);
    if (Number.isFinite(evento.plazo)) plazo = Math.min(plazo, evento.plazo);
  }
}

export function iniciarInactividad() {
  if (iniciada || !sesion) return;
  iniciada = true;
  crearCubierta();
  dialogo = document.createElement('dialog'); dialogo.className = 'pwa-sesion'; dialogo.setAttribute('aria-labelledby', 'pwa-sesion-titulo'); dialogo.setAttribute('tabindex','-1');
  const titulo = document.createElement('p'); titulo.id = 'pwa-sesion-titulo'; titulo.textContent = 'Tu sesión está por expirar. Si deseas seguir operando, puedes extenderla.';
  cuenta = document.createElement('p'); cuenta.setAttribute('role', 'timer'); cuenta.setAttribute('aria-live', 'off');
  mensaje = document.createElement('p'); mensaje.setAttribute('role', 'alert');
  continuar = document.createElement('button'); continuar.type = 'button'; continuar.textContent = 'EXTENDER SESIÓN'; continuar.addEventListener('click', renovar);
  const curvas = document.createElement('img'); curvas.src = '/recursos/menu/arcos-sesion.svg'; curvas.alt = ''; curvas.className = 'session-arcs';
  dialogo.append(titulo, cuenta, mensaje, continuar, curvas); document.body.append(dialogo);
  dialogo.addEventListener('cancel', event => event.preventDefault());
  aviso = document.createElement('div'); aviso.className = 'pwa-aviso-lectura'; aviso.hidden = true;
  aviso.setAttribute('role', 'status'); aviso.setAttribute('popover', 'manual');
  const textoAviso = document.createElement('span'); textoAviso.textContent = 'Tu sesión está por expirar.';
  cuentaDiscreta = document.createElement('small'); cuentaDiscreta.setAttribute('role', 'timer'); cuentaDiscreta.setAttribute('aria-live', 'off');
  mensajeDiscreto = document.createElement('p'); mensajeDiscreto.setAttribute('role', 'alert');
  const extender = document.createElement('button'); extender.type = 'button'; extender.textContent = 'Extender sesión'; extender.addEventListener('click', renovar);
  aviso.append(textoAviso, cuentaDiscreta, mensajeDiscreto, extender); document.body.append(aviso);
  try { canal = new BroadcastChannel('bancoagricola-sesion'); canal.onmessage = event => recibir(event.data); } catch { /* Fallback storage. */ }
  addEventListener('storage', event => {
    if (event.key === CLAVE) { try { recibir(JSON.parse(event.newValue)); } catch { /* Evento inválido. */ } }
  });
  // Scroll programático o restaurado no cuenta como interacción del usuario.
  for (const tipo of ['pointerdown', 'keydown', 'input']) document.addEventListener(tipo, actividad, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(envioPendiente);
    if (document.hidden) {
      if (ocultaDesde===null) ocultaDesde=Date.now();
      registrarSegundoPlano(sesion.id,localStorage,ocultaDesde);
      bloquear();
    } else {
      const desde=ocultaDesde??leerSegundoPlano(sesion.id,localStorage);
      if (vencioSegundoPlano(desde,Date.now())) return terminar();
      ocultaDesde=null;limpiarSegundoPlano(sesion.id,localStorage);
      verificar();
    }
  });
  addEventListener('pagehide', () => bloquear());
  setInterval(revisar, 250);
  revisar();
}

export function avisarCierre() {
  if (!sesion) return;
  finalizada = true; ocultarAviso(); clearTimeout(envioPendiente); limpiarSegundoPlano(sesion.id,localStorage);publicar('cierre');
}
