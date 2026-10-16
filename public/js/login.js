import { fetchSession, mayHaveSession, rememberLogin, forgetLogin, getJSON } from './comun.js';
import { necesitaCargaInicial, prepararInicio, transicionarInicio } from './inicio.js';
import { credencialesDePerfil } from './usuarios-prueba.js';
import { deslizarHaciaMenu, mostrarCargaAcceso, programarRetiroAviso } from './transiciones.js';
import { conMinimoCarga } from './carga-tiempo.js';

const form = document.querySelector('#login-form');
const { username, password } = form.elements;
const errorBox = document.querySelector('#login-error');
const submitButton = form.querySelector('[type="submit"]');
const startupScreen = document.querySelector('#startup-screen');
const startupError = document.querySelector('#startup-error');
const startupRetry = document.querySelector('#startup-retry');
const loginScreen = document.querySelector('.login');
const usersDialog = document.querySelector('#testing-users-dialog');
const usersList = document.querySelector('#testing-users-list');
const usersStatus = document.querySelector('#testing-users-status');
const usersRetry = document.querySelector('#retry-testing-users');
const aboutDialog = document.querySelector('#login-about');
let perfilesDisponibles = [];
let preparando = null;
let entrando = false;
let cicloAcceso = 0;

function prepararAcceso() {
  if (!preparando) {
    const actual = cargarAcceso(cicloAcceso);
    preparando = actual;
    actual.finally(() => { if (preparando === actual) preparando = null; });
  }
  return preparando;
}

function mostrarUsuarios(perfiles) {
  usersList.replaceChildren();
  for (const perfil of perfiles) {
    const boton = document.createElement('button'); boton.type = 'button'; boton.className = 'testing-user';
    const avatar = document.createElement('span'); avatar.className = 'testing-user-avatar';
    const icono = document.createElement('img'); icono.src = '/recursos/login/usuarios.svg'; icono.alt = ''; avatar.appendChild(icono);
    const detalles = document.createElement('span'); detalles.className = 'testing-user-details';
    const nombre = document.createElement('strong'); nombre.textContent = perfil.nombre;
    const usuario = document.createElement('small'); usuario.textContent = perfil.usuarioAcceso || 'Sin usuario de acceso';
    detalles.appendChild(nombre); detalles.appendChild(usuario); boton.appendChild(avatar); boton.appendChild(detalles);
    if (!perfil.promocionesAbiertas) { const punto = document.createElement('span'); punto.className = 'unopened-dot'; punto.setAttribute('role','img'); punto.setAttribute('aria-label','Promociones sin abrir'); boton.appendChild(punto); }
    boton.disabled = !perfil.usuarioAcceso;
    boton.addEventListener('click', () => {
      const credenciales = credencialesDePerfil(perfil);
      username.value = credenciales.usuario; password.value = credenciales.clave;
      showError(''); usersDialog.close();
      if (credenciales.clave) submitButton.focus(); else password.focus();
    });
    usersList.appendChild(boton);
  }
}

async function abrirUsuarios() {
  if (!usersDialog.open) usersDialog.showModal();
  mostrarUsuarios(perfilesDisponibles);
  usersStatus.textContent = 'Cargando usuarios…'; usersRetry.hidden = true;
  try {
    perfilesDisponibles = await getJSON('/api/perfiles?testing=1');
    mostrarUsuarios(perfilesDisponibles);
    usersStatus.textContent = perfilesDisponibles.length ? '' : 'No hay usuarios disponibles.';
  } catch (error) { usersStatus.textContent = error.message; usersRetry.hidden = false; }
}

async function cargarAcceso(ciclo) {
  const vigente = () => ciclo === cicloAcceso && !document.hidden;
  if (!vigente()) return;
  entrando = false;
  loginScreen.inert = false;
  form.reset();
  showError('');
  const primeraEntrada = necesitaCargaInicial(sessionStorage);
  startupScreen.hidden = false;
  loginScreen.hidden = true;
  startupError.hidden = true;
  startupRetry.disabled = true;
  submitButton.disabled = true;
  if (await redirectIfLoggedIn(vigente,primeraEntrada?2000:1000) || !vigente()) return;
  try {
    const resultado = await transicionarInicio(startupScreen, loginScreen, {
      indicador:document.querySelector('#startup-spinner'), formulario:form, vigente,
      preparar:async () => {
        if (!primeraEntrada) return {perfiles:perfilesDisponibles};
        const datos=await prepararInicio({storage:sessionStorage,minimo:0,cargarPerfiles:()=>getJSON('/api/perfiles?testing=1')});
        if (datos.error) throw datos.error;
        return datos;
      }
    });
    if (!vigente()) return;
    perfilesDisponibles=resultado.perfiles;
    submitButton.disabled = false;
    if (!document.querySelector('#session-expired').hidden) programarRetiroAviso(document.querySelector('#session-expired'));
  } catch {
    if (!vigente()) return;
    startupScreen.hidden = false;
    loginScreen.hidden = true;
    startupError.hidden = false;
    startupRetry.disabled = false;
  }
}

// Entrar siempre lleva primero al menú: con una sesión vigente no se muestra el login.
async function redirectIfLoggedIn(vigente,minimo) {
  try {
    const perfil = await conMinimoCarga(fetchSession,{minimo});
    if (!vigente()) return true;
    if (perfil) {
      await deslizarHaciaMenu(loginScreen, { modo:'fade' });
      return true;
    }
    const habiaSesion = mayHaveSession();
    forgetLogin();
    if (habiaSesion) document.querySelector('#session-expired').hidden = false;
    mostrarMotivoSalida();
  } catch {
    if (!vigente()) return true;
    startupScreen.hidden = false;
    startupError.hidden = false;
    startupRetry.disabled = false;
    return true;
  }
  document.body.removeAttribute('data-session');
  return false;
}

function showError(message, invalidFields = []) {
  errorBox.textContent = message;
  for (const input of [username, password]) {
    if (invalidFields.includes(input)) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  if (invalidFields.length) invalidFields[0].focus();
}

function missingFieldsError() {
  const missing = [username.value.trim() ? null : username, password.value ? null : password].filter(Boolean);
  if (missing.length === 2) return ['Escribe tu usuario y tu clave.', missing];
  if (missing[0] === username) return ['Escribe tu usuario.', missing];
  if (missing[0] === password) return ['Escribe tu clave.', missing];
  return null;
}

function setBusy(busy) {
  submitButton.disabled = busy;
  submitButton.textContent = busy ? 'Ingresando…' : 'Continuar';
}

// El backend valida usuario y clave contra la base de datos y, si coinciden, crea la sesión.
async function enter() {
  if (entrando) return;
  const missing = missingFieldsError();
  if (missing) return showError(...missing);
  showError('');
  document.querySelector('#session-expired').hidden = true;
  setBusy(true);
  entrando = true;
  loginScreen.inert = true;
  const ciclo = cicloAcceso;
  let aceptado=false;
  try {
    const peticion = fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: username.value.trim(), contrasena: password.value })
    }).then(response=>({response}),error=>({error}));
    await mostrarCargaAcceso(form,document.querySelector('#startup-spinner'));
    const resultado=await peticion;
    if(resultado.error) throw resultado.error;
    const response=resultado.response;
    if (response.ok) {
      aceptado=true;
      rememberLogin();
      if (ciclo !== cicloAcceso || document.hidden) return;
      await deslizarHaciaMenu(loginScreen);
      return;
    }
    const { error } = await response.json().catch(() => ({}));
    const invalid = response.status === 401 ? [username, password] : [];
    loginScreen.inert=false;
    form.hidden=false;
    showError(error || 'No se pudo iniciar sesión. Intenta de nuevo.', invalid);
  } catch {
    showError('No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.');
  } finally {
    if(!aceptado && ciclo===cicloAcceso && !document.hidden){
      document.querySelector('#startup-spinner').hidden=true;form.hidden=false;loginScreen.inert=false;
      setBusy(false);entrando=false;
    }
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  enter();
});
form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));

addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cicloAcceso++;
    preparando = null;
    usersDialog.close(); aboutDialog.close();
    startupScreen.hidden = false; loginScreen.hidden = true;
  } else return prepararAcceso();
});
startupRetry.addEventListener('click', prepararAcceso);
document.querySelector('#show-testing-users').addEventListener('click', abrirUsuarios);
document.querySelector('#login-recover').addEventListener('click', abrirUsuarios);
usersRetry.addEventListener('click', abrirUsuarios);
document.querySelector('#close-testing-users').addEventListener('click', () => usersDialog.close());
for (const id of ['#login-contact','#login-help']) document.querySelector(id).addEventListener('click', () => aboutDialog.showModal());
document.querySelector('#close-login-about').addEventListener('click', () => aboutDialog.close());
function mostrarMotivoSalida() { try {
  const motivo = sessionStorage.getItem('bancoagricola-motivo-salida');
  sessionStorage.removeItem('bancoagricola-motivo-salida');
  if (motivo === 'inactividad') document.querySelector('#session-expired').hidden = false;
} catch { /* El acceso no depende del almacenamiento local. */ } }
mostrarMotivoSalida();
prepararAcceso();
