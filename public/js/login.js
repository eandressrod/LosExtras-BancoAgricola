import { fetchSession, mayHaveSession, rememberLogin, forgetLogin } from './comun.js';

const form = document.querySelector('#login-form');
const { username, password } = form.elements;
const errorBox = document.querySelector('#login-error');
const submitButton = form.querySelector('[type="submit"]');

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
  submitButton.textContent = busy ? 'Ingresando…' : 'Ingresar';
}

// El backend valida usuario y clave contra la base de datos y, si coinciden, crea la sesión.
async function enter() {
  const missing = missingFieldsError();
  if (missing) return showError(...missing);
  showError('');
  setBusy(true);
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
  setBusy(false);
}

form.addEventListener('submit', event => {
  event.preventDefault();
  enter();
});
form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));

addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
redirectIfLoggedIn();
