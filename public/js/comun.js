export const categories = ['Restaurantes', 'Compras', 'Entretenimiento'];
const CARD_NAMES = { basica: 'Básica', black: 'Black' };
const LOGIN_HINT_KEY = 'los-extras-sesion-iniciada';
const PREFERENCES_KEY = 'los-extras-preferencias';

export function readStorage(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

export function saveStorage(storage, key, value) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
    return true;
  } catch { return false; }
}

export function cardShortName(profile) { return CARD_NAMES[profile.tipoTarjeta] ?? profile.tipoTarjeta; }
export function cardName(profile) { return 'Tarjeta ' + cardShortName(profile); }

// Solo una pista local para no consultar la sesión en el login sin haber entrado.
// La identidad nunca se guarda en el navegador: la conoce el backend por la cookie HttpOnly.
export function rememberLogin() { saveStorage(localStorage, LOGIN_HINT_KEY, '1'); }
export function forgetLogin() { saveStorage(localStorage, LOGIN_HINT_KEY, null); }
export function mayHaveSession() { return readStorage(localStorage, LOGIN_HINT_KEY) === '1'; }

/** Perfil de la sesión activa, null si no hay sesión; lanza un error si no se pudo verificar. */
export async function fetchSession() {
  const response = await fetch('/api/auth/sesion', { cache: 'no-store' });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('No se pudo verificar la sesión.');
  return (await response.json()).perfil;
}

/** Protege una página: sin sesión vuelve al login; con sesión muestra el perfil y la página. */
export async function requireSession() {
  // Al volver con Atrás, el navegador puede restaurar la página de otro perfil: se verifica de nuevo.
  addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
  let profile;
  try {
    profile = await fetchSession();
  } catch {
    showSessionError();
    return null;
  }
  if (!profile) {
    forgetLogin();
    location.replace('/index.html');
    return null;
  }
  const badge = document.querySelector('#session-profile');
  if (badge) {
    badge.textContent = `${profile.nombre} · ${cardName(profile)}`;
    badge.hidden = false;
  }
  document.body.removeAttribute('data-session');
  return profile;
}

function showSessionError() {
  const main = document.querySelector('main');
  const message = document.createElement('p');
  message.className = 'error';
  message.setAttribute('role', 'alert');
  message.textContent = 'No se pudo verificar tu sesión. Intenta de nuevo en unos momentos.';
  const actions = document.createElement('div');
  actions.className = 'actions';
  const retry = actions.appendChild(document.createElement('button'));
  retry.type = 'button';
  retry.textContent = 'Reintentar';
  retry.addEventListener('click', () => location.reload());
  main.replaceChildren(...[main.querySelector('h1'), message, actions].filter(Boolean));
  document.body.removeAttribute('data-session');
}

export async function logout() {
  const response = await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
  if (!response?.ok) throw new Error('No se pudo cerrar la sesión. Revisa tu conexión e intenta de nuevo.');
  forgetLogin();
}

// Preferencias locales separadas por perfil: el otro perfil no hereda la encuesta.
const preferencesKey = profileId => `${PREFERENCES_KEY}:${profileId}`;

export function loadPreferences(profileId) {
  try {
    const saved = JSON.parse(readStorage(localStorage, preferencesKey(profileId)));
    if (saved?.completed === true && Array.isArray(saved.categories)) {
      return { completed: true, categories: saved.categories.filter(category => categories.includes(category)) };
    }
  } catch { /* Un dato inválido deja la encuesta pendiente. */ }
  return { completed: false, categories: [] };
}

export function savePreferences(profileId, selected) {
  return saveStorage(localStorage, preferencesKey(profileId), JSON.stringify({ completed: true, categories: selected }));
}

export async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
  return response.json();
}
