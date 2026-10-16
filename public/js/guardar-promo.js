export async function consultarGuardadas() {
  const response = await fetch('/api/guardadas', { cache: 'no-store' });
  if (response.status === 401) {
    location.replace('/index.html');
    return null;
  }
  if (!response.ok) throw new Error('No se pudieron cargar las promociones guardadas. Intenta de nuevo.');
  return response.json();
}

export function marcarBoton(boton, guardada) {
  boton.dataset.guardada = guardada ? 'si' : 'no';
  boton.textContent = guardada ? 'Quitar' : 'Guardar';
}

export function alPulsarGuardar(boton, id, alTerminar) {
  boton.onclick = async event => {
    event.preventDefault();
    event.stopPropagation();
    const estabaGuardada = boton.dataset.guardada === 'si';
    const aviso = boton.parentElement.querySelector('.guardar-error');
    boton.disabled = true;
    if (aviso) aviso.textContent = '';
    try {
      const response = await fetch('/api/guardadas', {
        method: estabaGuardada ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promocionId: id })
      });
      if (response.status === 401) {
        location.replace('/index.html');
        return;
      }
      if (!response.ok) throw new Error('No se pudo actualizar. Intenta de nuevo.');
      marcarBoton(boton, !estabaGuardada);
      if (alTerminar) alTerminar(!estabaGuardada);
    } catch (error) {
      if (aviso) aviso.textContent = error.message;
    } finally {
      boton.disabled = false;
    }
  };
}
