import { fetchSession, mayHaveSession, rememberLogin, forgetLogin } from './comun.js';

const form = document.querySelector('#login-form');
const { username, password } = form.elements;
const errorBox = document.querySelector('#login-error');
const buttons = [...document.querySelectorAll('main button')];
let busyButton = null;

// Entrar siempre lleva primero al menú: con una sesión vigente no se muestra el login.
async function redirectIfLoggedIn() {
  if (!mayHaveSession()) return;
  document.body.dataset.session = 'pending';
  try {
    if (await fetchSession()) {
      location.replace('/menu.html');
      return;
    }
    forgetLogin();
  } catch { /* Sin conexión: se muestra el formulario. */ }
  document.body.removeAttribute('data-session');
}

function showError(message, invalidFields = []) {
  errorBox.textContent = message;
  for (const input of [username, password]) {
    if (invalidFields.includes(input)) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
  }
  if (invalidFields.length) invalidFields[0].focus();
  else if (message) errorBox.scrollIntoView({ block: 'nearest' });
}

function missingFieldsError() {
  const missing = [username.value.trim() ? null : username, password.value ? null : password].filter(Boolean);
  if (missing.length === 2) return ['Escribe el usuario y la contraseña de prueba.', missing];
  if (missing[0] === username) return ['Escribe el usuario de prueba.', missing];
  if (missing[0] === password) return ['Escribe la contraseña de prueba.', missing];
  return null;
}

function setBusy(button) {
  for (const item of buttons) item.disabled = Boolean(button);
  if (button) {
    button.dataset.label = button.textContent;
    button.textContent = 'Entrando…';
  } else if (busyButton) {
    busyButton.textContent = busyButton.dataset.label;
  }
  busyButton = button;
}

async function enter(trigger) {
  const missing = missingFieldsError();
  if (missing) return showError(...missing);
  showError('');
  setBusy(trigger);
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: username.value.trim(), contrasena: password.value })
    });
    if (response.ok) {
      rememberLogin();
      location.replace('/menu.html');
      return;
    }
    const { error } = await response.json().catch(() => ({}));
    const invalid = response.status === 401 ? [username, password] : [];
    showError(error || 'No se pudo iniciar sesión. Intenta de nuevo.', invalid);
  } catch {
    showError('No hay conexión con el servidor. Revisa tu conexión e intenta de nuevo.');
  }
  setBusy(null);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  enter(event.submitter ?? form.querySelector('[type="submit"]'));
});
form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));

// Accesos de prueba: completan el formulario con los datos visibles del perfil y entran.
for (const button of document.querySelectorAll('[data-usuario]')) {
  button.addEventListener('click', () => {
    username.value = button.dataset.usuario;
    password.value = button.dataset.contrasena;
    enter(button);
  });
}

addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
redirectIfLoggedIn();
