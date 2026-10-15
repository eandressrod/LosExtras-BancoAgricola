import { estadoInactividad, plazoLocal } from './inactividad-modelo.js';

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
  if (dialogo?.open) dialogo.close();
  document.documentElement.setAttribute('data-pwa-bloqueada', '');
  cubierta.replaceChildren();
  const contenido = document.createElement('div');
  const p = document.createElement('p'); p.textContent = texto; contenido.append(p);
  if (reintentar) {
    const boton = document.createElement('button'); boton.type = 'button'; boton.textContent = 'Reintentar';
    boton.addEventListener('click', verificar); contenido.append(boton);
  }
  cubierta.append(contenido); cubierta.hidden = false;
}
function desbloquear() {
  document.documentElement.removeAttribute('data-pwa-bloqueada'); cubierta.hidden = true;
}

function terminar(motivo = 'inactividad', compartir = true) {
  if (finalizada) return;
  finalizada = true;
  clearTimeout(envioPendiente);
  bloquear('Tu sesión terminó.');
  try { sessionStorage.setItem('bancoagricola-motivo-salida', motivo); localStorage.removeItem('los-extras-sesion-iniciada'); } catch { /* Cookie validada en backend. */ }
  if (compartir) publicar('cierre');
  // No dependemos de esta petición para impedir acceso: el backend comprueba el plazo.
  if (motivo === 'inactividad') fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {});
  location.replace('/index.html');
}

async function cerrarVoluntariamente() {
  if (peticion || finalizada) return;
  peticion = true; continuar.disabled = true;
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (!response.ok) throw new Error();
    terminar('cierre');
  } catch { mensaje.textContent = 'No se pudo cerrar la sesión. Revisa tu conexión e intenta de nuevo.'; }
  finally { peticion = false; continuar.disabled = false; }
}

function revisar() {
  if (!sesion || finalizada) return;
  const estado = estadoInactividad(plazo);
  if (estado.estado === 'vencida') return terminar();
  if (document.hidden || verificando) return;
  if (estado.estado === 'aviso') {
    cuenta.textContent = `Tu sesión se cerrará en ${estado.segundos} segundos.`;
    if (!dialogo.open) dialogo.showModal();
  } else if (dialogo.open) { dialogo.close(); mensaje.textContent = ''; }
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
    mensaje.textContent = '';
  } catch {
    mensaje.textContent = 'No se pudo continuar la sesión. Revisa tu conexión e intenta de nuevo.';
  } finally { peticion = false; continuar.disabled = false; }
}

function actividad(event) {
  if (!event.isTrusted || document.hidden || verificando || finalizada || dialogo.open) return;
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
  try {
    const response = await fetch('/api/auth/sesion', { cache: 'no-store' });
    if (finalizada) return;
    if (response.status === 401) return terminar();
    if (!response.ok) throw new Error();
    const datos = await response.json();
    // Si se cambió de usuario en otra pestaña, recargar antes de revelar el perfil anterior.
    if (sesion && datos.sesion.id !== sesion.id) { location.reload(); return; }
    actualizarSesion(datos.sesion);
    desbloquear();
  } catch { bloquear('No se pudo verificar tu sesión. Revisa tu conexión.', true); }
  finally { verificando = false; revisar(); }
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
  cubierta = document.createElement('div'); cubierta.className = 'pwa-privacidad'; cubierta.hidden = true;
  cubierta.setAttribute('role', 'status'); document.body.append(cubierta);
  dialogo = document.createElement('dialog'); dialogo.className = 'pwa-sesion'; dialogo.setAttribute('aria-labelledby', 'pwa-sesion-titulo');
  const titulo = document.createElement('h2'); titulo.id = 'pwa-sesion-titulo'; titulo.textContent = '¿Deseas continuar?';
  cuenta = document.createElement('p'); cuenta.setAttribute('role', 'timer'); cuenta.setAttribute('aria-live', 'off');
  mensaje = document.createElement('p'); mensaje.setAttribute('role', 'alert');
  continuar = document.createElement('button'); continuar.type = 'button'; continuar.textContent = 'Continuar'; continuar.addEventListener('click', renovar);
  const salir = document.createElement('button'); salir.type = 'button'; salir.textContent = 'Cerrar sesión'; salir.addEventListener('click', cerrarVoluntariamente);
  dialogo.append(titulo, cuenta, mensaje, continuar, salir); document.body.append(dialogo);
  dialogo.addEventListener('cancel', event => event.preventDefault());
  try { canal = new BroadcastChannel('bancoagricola-sesion'); canal.onmessage = event => recibir(event.data); } catch { /* Fallback storage. */ }
  addEventListener('storage', event => {
    if (event.key === CLAVE) { try { recibir(JSON.parse(event.newValue)); } catch { /* Evento inválido. */ } }
  });
  // Scroll programático o restaurado no cuenta como interacción del usuario.
  for (const tipo of ['pointerdown', 'keydown', 'input', 'wheel', 'touchmove']) document.addEventListener(tipo, actividad, { passive: true, capture: true });
  document.addEventListener('visibilitychange', () => {
    clearTimeout(envioPendiente);
    if (document.hidden) bloquear(); else verificar();
  });
  addEventListener('pagehide', () => bloquear());
  setInterval(revisar, 250);
  revisar();
}

export function avisarCierre() {
  if (!sesion) return;
  finalizada = true; clearTimeout(envioPendiente); publicar('cierre');
}
