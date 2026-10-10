import { requireSession } from './comun.js';

const profile = await requireSession();
if (profile) {
  const form = document.querySelector('#survey-form');
  const error = document.querySelector('#survey-error');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const selected = new FormData(form).getAll('category');
    if (!selected.length) {
      error.textContent = 'Selecciona al menos una categoría o elige Omitir por ahora.';
      return;
    }
    error.textContent = '';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
      const response = await fetch('/api/preferencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categorias: selected })
      });

      if (response.ok) {
        // Criterio 4: Guardado exitoso en base de datos, redirigir a Para Ti
        location.assign('/promociones.html');
        return;
      }

      // Manejo de errores controlados desde el backend
      const data = await response.json().catch(() => ({}));
      error.textContent = data.error || 'No se pudieron guardar tus preferencias. Intenta de nuevo.';
    } catch (e) {
      // Criterio 6: Fallo de red (permite reintentar y el form conserva la selección)
      error.textContent = 'Error de conexión. Revisa tu internet e intenta de nuevo.';
    }

    // Restaurar botón si hubo fallo para permitir reintento
    submitBtn.disabled = false;
    submitBtn.textContent = 'Guardar y ver promociones';
  });
}
