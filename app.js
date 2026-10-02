// Login público de demostración. No usar credenciales reales aquí.
const DEMO_USER = 'demo';
const DEMO_PASSWORD = 'demo123';
const SESSION_KEY = 'los-extras-session';
const PREFERENCES_KEY = 'los-extras-demo-preferences';
const categories = ['Restaurantes', 'Compras', 'Entretenimiento'];
const promotions = [
  { id: 'restaurante', merchant: 'Restaurante de prueba', category: 'Restaurantes', benefit: '10 % de descuento', description: 'Descuento en una comida de demostración.', payment: 'Tarjeta de débito de prueba', restrictions: 'Una compra por usuario. No acumulable con otras ofertas.' },
  { id: 'tienda', merchant: 'Tienda de prueba', category: 'Compras', benefit: '15 % de descuento', description: 'Descuento en artículos seleccionados de demostración.', payment: 'Tarjeta de crédito de prueba', restrictions: 'Solo artículos seleccionados. No incluye envío.' },
  { id: 'cine', merchant: 'Cine de prueba', category: 'Entretenimiento', benefit: '2 entradas por el precio de 1', description: 'Beneficio para una función de demostración.', payment: 'Tarjeta de débito o crédito de prueba', restrictions: 'Sujeto a disponibilidad. No aplica a funciones especiales.' },
];

const app = document.querySelector('#app');
let sessionActive = readStorage(sessionStorage, SESSION_KEY) === 'demo';
let preferences = loadPreferences();
let storageAvailable = true;

function readStorage(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

function saveStorage(storage, key, value) {
  try {
    if (value === null) storage.removeItem(key);
    else storage.setItem(key, value);
  } catch {
    storageAvailable = false;
  }
}

function loadPreferences() {
  try {
    const saved = JSON.parse(readStorage(localStorage, PREFERENCES_KEY));
    if (saved?.completed === true && Array.isArray(saved.categories)) {
      return { completed: true, categories: saved.categories.filter(category => categories.includes(category)) };
    }
  } catch { /* Si el dato local no es válido, mostrar la encuesta. */ }
  return { completed: false, categories: [] };
}

function render(content) {
  app.innerHTML = content;
  const heading = app.querySelector('h1');
  heading.tabIndex = -1;
  heading.focus();
}

function requireSession() {
  if (sessionActive) return true;
  showLogin();
  return false;
}

function showLogin() {
  render(`
    <h1>Iniciar sesión</h1>
    <p>Acceso de prueba: usuario <strong>demo</strong> y contraseña <strong>demo123</strong>.</p>
    <p class="note">Es una simulación pública. No ingreses tu contraseña bancaria ni una contraseña personal.</p>
    <form id="login-form">
      <label>Usuario<input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" required></label>
      <label>Contraseña de prueba<input name="password" type="password" autocomplete="off" required></label>
      <p id="login-error" class="error" role="alert"></p>
      <button type="submit">Entrar</button>
    </form>
  `);
  app.querySelector('#login-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get('username').trim() !== DEMO_USER || data.get('password') !== DEMO_PASSWORD) {
      app.querySelector('#login-error').textContent = 'Usuario o contraseña de prueba incorrectos.';
      return;
    }
    sessionActive = true;
    saveStorage(sessionStorage, SESSION_KEY, 'demo');
    showMenu();
  });
}

function showMenu() {
  if (!requireSession()) return;
  render(`
    <h1>Menú</h1>
    <p>Bienvenido, usuario de prueba.</p>
    <div class="actions">
      <button id="open-promotions">Promociones</button>
      <button id="logout" class="secondary">Cerrar sesión</button>
    </div>
    <p class="note">Este esqueleto solo incluye el módulo de promociones.</p>
  `);
  app.querySelector('#open-promotions').addEventListener('click', () => {
    if (preferences.completed) showPromotions();
    else showSurvey();
  });
  app.querySelector('#logout').addEventListener('click', () => {
    sessionActive = false;
    saveStorage(sessionStorage, SESSION_KEY, null);
    showLogin();
  });
}

function showSurvey() {
  if (!requireSession()) return;
  render(`
    <h1>Tus intereses</h1>
    <p>Antes de ver promociones por primera vez, cuéntanos qué te interesa.</p>
    <form id="survey-form">
      <fieldset>
        <legend>Elige una o varias categorías</legend>
        ${categories.map(category => `<label class="option"><input type="checkbox" name="category" value="${category}">${category}</label>`).join('')}
      </fieldset>
      <p id="survey-error" class="error" role="alert"></p>
      <button type="submit">Guardar y ver promociones</button>
      <button id="skip-survey" type="button" class="secondary">Omitir por ahora</button>
      <button id="back-menu" type="button" class="secondary">Volver al menú</button>
    </form>
    <p class="note">Las preferencias se guardan en este navegador. Si omites la encuesta, volverá a aparecer al entrar al módulo hasta que la completes.</p>
  `);
  app.querySelector('#survey-form').addEventListener('submit', event => {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).getAll('category');
    if (!selected.length) {
      app.querySelector('#survey-error').textContent = 'Selecciona al menos una categoría o elige Omitir por ahora.';
      return;
    }
    preferences = { completed: true, categories: selected };
    saveStorage(localStorage, PREFERENCES_KEY, JSON.stringify(preferences));
    showPromotions();
  });
  app.querySelector('#skip-survey').addEventListener('click', showPromotions);
  app.querySelector('#back-menu').addEventListener('click', showMenu);
}

function showPromotions() {
  if (!requireSession()) return;
  const visible = preferences.completed
    ? promotions.filter(promotion => preferences.categories.includes(promotion.category))
    : promotions;
  render(`
    <h1>Para ti</h1>
    <p>${preferences.completed ? 'Promociones según tus intereses.' : 'Catálogo de prueba sin personalizar.'}</p>
    ${!storageAvailable ? '<p class="note" role="status">El navegador no permite guardar los datos. Puedes continuar, pero los cambios podrían perderse al recargar.</p>' : ''}
    <div class="cards">
      ${visible.map(promotion => `
        <article>
          <h2>${promotion.merchant}</h2>
          <p><strong>${promotion.benefit}</strong></p>
          <p>${promotion.description}</p>
          <p class="note">Vigencia ficticia: hasta el 6 de noviembre de 2026.</p>
          <button data-promotion="${promotion.id}" aria-label="Ver promoción de ${promotion.merchant}">Ver promoción</button>
        </article>
      `).join('') || '<p>No hay promociones para tus intereses.</p>'}
    </div>
    <div class="actions"><button id="back-menu" class="secondary">Volver al menú</button></div>
  `);
  app.querySelectorAll('[data-promotion]').forEach(button => {
    button.addEventListener('click', () => showDetail(button.dataset.promotion));
  });
  app.querySelector('#back-menu').addEventListener('click', showMenu);
}

function showDetail(id) {
  if (!requireSession()) return;
  const promotion = promotions.find(item => item.id === id);
  if (!promotion) { showPromotions(); return; }
  render(`
    <h1>${promotion.merchant}</h1>
    <p><strong>${promotion.benefit}</strong></p>
    <p>${promotion.description}</p>
    <h2>Vigencia</h2><p>Hasta el 6 de noviembre de 2026 (fecha ficticia).</p>
    <h2>Medio de pago</h2><p>${promotion.payment}</p>
    <h2>Restricciones</h2><p>${promotion.restrictions}</p>
    <div class="actions">
      <button id="use-promotion">Usar promoción</button>
      <div id="instructions" hidden>
        <h2 tabindex="-1">Instrucciones de prueba</h2>
        <p>En un caso real, consultarías el beneficio con el comercio y presentarías el medio de pago indicado. Esta demo no genera cupones, realiza pagos ni canjea beneficios.</p>
      </div>
      <button id="back-list" class="secondary">Volver al listado</button>
    </div>
  `);
  app.querySelector('#use-promotion').addEventListener('click', () => {
    const instructions = app.querySelector('#instructions');
    instructions.hidden = false;
    instructions.querySelector('h2').focus();
  });
  app.querySelector('#back-list').addEventListener('click', showPromotions);
}

if (sessionActive) showMenu();
else showLogin();
