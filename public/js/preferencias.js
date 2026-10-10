import { requireSession, getJSON } from './comun.js';

if (await requireSession()) {
  const form = document.querySelector('#preferences-form');
  const status = document.querySelector('#preferences-status');
  const error = document.querySelector('#preferences-error');
  const save = document.querySelector('#save-preferences');
  const cancel = document.querySelector('#cancel-preferences');
  const retry = document.querySelector('#retry');
  const inputs = [...document.querySelectorAll('input[name="category"]')];
  let saving = false;

  async function loadPreferences() {
    form.hidden = true;
    retry.hidden = true;
    status.className = 'note';
    status.textContent = 'Cargando preferencias…';
    try {
      const preferences = await getJSON('/api/preferencias');
      inputs.forEach(input => { input.checked = preferences.categories.includes(input.value); });
      form.hidden = false;
      status.textContent = '';
    } catch (failure) {
      status.className = 'error';
      status.textContent = failure.message;
      retry.hidden = false;
    }
  }

  cancel.addEventListener('click', event => { if (saving) event.preventDefault(); });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (saving) return;
    const categorias = inputs.filter(input => input.checked).map(input => input.value);
    error.textContent = '';
    if (!categorias.length) {
      error.textContent = 'Selecciona al menos una categoría.';
      return;
    }
    saving = true;
    save.disabled = true;
    save.textContent = 'Guardando…';
    cancel.setAttribute('aria-disabled', 'true');
    inputs.forEach(input => { input.disabled = true; });
    try {
      const response = await fetch('/api/preferencias', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorias })
      }).catch(() => { throw new Error('No se pudieron guardar tus preferencias. Revisa tu conexión e intenta de nuevo.'); });
      if (response.status === 401) { location.replace('/index.html'); return; }
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'No se pudieron guardar tus preferencias. Intenta de nuevo.');
      }
      location.assign('/promociones.html');
    } catch (failure) {
      error.textContent = failure.message;
    } finally {
      saving = false;
      save.disabled = false;
      save.textContent = 'Guardar cambios';
      cancel.removeAttribute('aria-disabled');
      inputs.forEach(input => { input.disabled = false; });
    }
  });
  retry.addEventListener('click', loadPreferences);
  await loadPreferences();
}
