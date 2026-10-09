import { requireSession, savePreferences } from './comun.js';

const profile = await requireSession();
if (profile) {
  document.querySelector('#survey-form').addEventListener('submit', event => {
    event.preventDefault();
    const selected = new FormData(event.currentTarget).getAll('category');
    const error = document.querySelector('#survey-error');
    if (!selected.length) {
      error.textContent = 'Selecciona al menos una categoría o elige Omitir por ahora.';
      return;
    }
    if (!savePreferences(profile.id, selected)) {
      error.textContent = 'No se pudieron guardar tus preferencias. Puedes omitir la encuesta para continuar.';
      return;
    }
    location.assign('/promociones.html');
  });
}
