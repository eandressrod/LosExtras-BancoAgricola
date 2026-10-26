import { actualizarSesion, iniciarInactividad, avisarCierre, expirarSesion } from '../pwa/inactividad.js';
import { conMinimoCarga } from './carga-tiempo.js';
import { leerSegundoPlano, limpiarSegundoPlano, vencioSegundoPlano } from '../pwa/inactividad-modelo.js';
import { olvidarInstantaneas } from './instantanea.js';
import { limpiarEleccion } from './cerca/origen.js';
export const categories = ['Restaurantes', 'Compras', 'Entretenimiento'];
const CARD_NAMES = { basica: 'Básica', black: 'Black' };
const LOGIN_HINT_KEY = 'los-extras-sesion-iniciada';
const PREFERENCES_KEY = 'los-extras-preferencias';
const CARD_CHOICE_PREFIX = 'los-extras-tarjeta:';

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

/** sessionStorage de esta pestaña, o null si el navegador no lo permite. */
export function almacenSesion() {
  try { return sessionStorage; } catch { return null; }
}

// H16: la tarjeta elegida es temporal, por perfil y por pestaña; el backend valida que sea propia.
export function cardChoiceKey(profileId) { return CARD_CHOICE_PREFIX + profileId; }

/** Borra las elecciones de tarjeta de cualquier perfil: una sesión nueva empieza sin elección. */
export function forgetCardSelections(storage = almacenSesion()) {
  try {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key?.startsWith(CARD_CHOICE_PREFIX)) storage.removeItem(key);
    }
  } catch { /* Sin almacenamiento no hay elecciones que borrar. */ }
}

// Pista de presentación; nunca sustituye la consulta de sesión al backend.
// La identidad nunca se guarda en el navegador: la conoce el backend por la cookie HttpOnly.
// Una sesión nueva empieza sin tarjeta elegida ni instantánea de Para ti (H16 y H22), ni origen de Cerca de ti (H8).
function forgetSessionChoices() {
  forgetCardSelections();
  olvidarInstantaneas(almacenSesion());
  const sesion = almacenSesion();
  if (sesion) limpiarEleccion(sesion);
}
export function rememberLogin() { saveStorage(localStorage, LOGIN_HINT_KEY, '1'); forgetSessionChoices(); }
export function forgetLogin() { saveStorage(localStorage, LOGIN_HINT_KEY, null); forgetSessionChoices(); }
export function mayHaveSession() { return readStorage(localStorage, LOGIN_HINT_KEY) === '1'; }

export function revelarPagina() {
  document.body.removeAttribute('data-session');
  document.documentElement.removeAttribute('data-arranque');
  document.documentElement.removeAttribute('aria-busy');
}

export function volverAlLogin() {
  // En una página privada, un 401 o la pérdida de sesión también necesitan un aviso al regresar.
  const anterior = mayHaveSession();
  if (anterior) saveStorage(almacenSesion(), 'bancoagricola-motivo-salida', 'inactividad');
  forgetLogin();
  if (anterior) { expirarSesion(); return; }
  location.replace('/index.html');
}

/** Perfil de la sesión activa, null si no hay sesión; lanza un error si no se pudo verificar. */
export async function fetchSession() {
  const response = await conMinimoCarga(() => fetch('/api/auth/sesion', { cache: 'no-store' }));
  if (!response.ok) throw new Error('No se pudo verificar la sesión.');
  const data = await response.json();
  if (!data.perfil) return null;
  if (vencioSegundoPlano(leerSegundoPlano(data.sesion?.id,localStorage))) {
    const cierre=await fetch('/api/auth/logout',{method:'POST',keepalive:true});
    if (!cierre.ok) throw new Error('No se pudo cerrar la sesión. Intenta de nuevo.');
    saveStorage(almacenSesion(),'bancoagricola-motivo-salida','inactividad');
    limpiarSegundoPlano(data.sesion?.id,localStorage);forgetLogin();
    return null;
  }
  if (typeof document==='undefined'||!document.hidden) limpiarSegundoPlano(data.sesion?.id,localStorage);
  actualizarSesion(data.sesion);
  return data.perfil;
}

/** Protege una página: sin sesión vuelve al login; con sesión muestra el perfil y la página. */
export async function requireSession({ revelar = true } = {}) {
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
    volverAlLogin();
    return null;
  }
  const badge = document.querySelector('#session-profile');
  if (badge) {
    badge.textContent = `${profile.nombre} · ${cardName(profile)}`;
    badge.hidden = false;
  }
  if (revelar) revelarPagina();
  iniciarInactividad();
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
  revelarPagina();
}

export async function logout() {
  const response = await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
  if (!response?.ok) throw new Error('No se pudo cerrar la sesión. Revisa tu conexión e intenta de nuevo.');
  forgetLogin();
  avisarCierre();
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

export async function getJSON(url) {
  const errorCarga = 'No se pudieron cargar los datos. Intenta de nuevo.';
  const response = await fetch(url, { cache: 'no-store' }).catch(() => { throw new Error(errorCarga); });
  if (response.status === 401) {
    volverAlLogin();
    throw new Error('Inicia sesión para continuar.');
  }
  if (!response.ok) throw new Error(errorCarga);
  return response.json().catch(() => { throw new Error(errorCarga); });
}
