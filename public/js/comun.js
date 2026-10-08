export const categories = ['Restaurantes', 'Compras', 'Entretenimiento'];
const SESSION_KEY = 'los-extras-session';
const PREFERENCES_KEY = 'los-extras-demo-preferences';

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

export function getSession() { return readStorage(sessionStorage, SESSION_KEY); }
export function setSession(value) { return saveStorage(sessionStorage, SESSION_KEY, value); }
export function requireSession() {
  if (getSession() === 'demo') return true;
  location.replace('/index.html');
  return false;
}

export function loadPreferences() {
  try {
    const saved = JSON.parse(readStorage(localStorage, PREFERENCES_KEY));
    if (saved?.completed === true && Array.isArray(saved.categories)) {
      return { completed: true, categories: saved.categories.filter(category => categories.includes(category)) };
    }
  } catch { /* Un dato inválido deja la encuesta pendiente. */ }
  return { completed: false, categories: [] };
}

export function savePreferences(categories) {
  return saveStorage(localStorage, PREFERENCES_KEY, JSON.stringify({ completed: true, categories }));
}

export async function getJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error('No se pudieron cargar los datos. Intenta de nuevo.');
  return response.json();
}
