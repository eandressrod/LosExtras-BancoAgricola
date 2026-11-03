import { volverAlLogin } from './comun.js';

/** Ids que Guardadas pinta. ids sigue trayendo también las ocultas por tarjeta o intereses. */
export function idsVisiblesGuardadas(datos) {
  if (!Array.isArray(datos?.promociones)) return [];
  return datos.promociones.map(promo => promo?.id).filter(id => typeof id === 'string');
}

/** Cuenta en el icono si se puede usar y, cuando hay intereses, su categoría está entre ellos. */
export function cuentaEnGuardadas(promotion, categorias) {
  if (!promotion || promotion.canUse === false) return false;
  const intereses = Array.isArray(categorias) ? categorias : [];
  return intereses.length === 0 || intereses.includes(promotion.category);
}

export async function consultarGuardadas(tarjetaId, comercio) {
  let ruta = tarjetaId ? '/api/guardadas?tarjeta=' + encodeURIComponent(tarjetaId) : '/api/guardadas';
  if (comercio) ruta += (ruta.includes('?') ? '&' : '?') + 'comercio=' + encodeURIComponent(comercio);
  const response = await fetch(ruta, { cache: 'no-store' });
  if (response.status === 401) {
    volverAlLogin();
    return null;
  }
  if (!response.ok) throw new Error('No se pudieron cargar las promociones guardadas. Intenta de nuevo.');
  return response.json();
}

export function marcarBoton(boton, guardada) {
  boton.dataset.guardada = guardada ? 'si' : 'no';
  boton.textContent = guardada ? 'Quitar' : 'Guardar';
}

/** Guarda o quita según el estado del botón. Devuelve el estado nuevo, o null si la sesión terminó; lanza si no se pudo. */
export async function cambiarGuardada(boton, id) {
  const estabaGuardada = boton.dataset.guardada === 'si';
  const response = await fetch('/api/guardadas', {
    method: estabaGuardada ? 'DELETE' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ promocionId: id })
  });
  if (response.status === 401) {
    volverAlLogin();
    return null;
  }
  if (!response.ok) throw new Error('No se pudo actualizar. Intenta de nuevo.');
  marcarBoton(boton, !estabaGuardada);
  return !estabaGuardada;
}

/**
 * Guardar o Quitar del listado, Guardadas y el detalle. El botón queda desactivado hasta terminar, así un segundo
 * toque no repite la petición. `aviso` es donde se muestra el error; por defecto, el `.guardar-error` vecino.
 */
export function alPulsarGuardar(boton, id, alTerminar, aviso) {
  boton.onclick = async event => {
    event.preventDefault();
    event.stopPropagation();
    // SCRUM-138: un segundo toque mientras la petición sigue en curso no cuenta.
    if (boton.disabled) return;
    const destino = aviso ?? boton.parentElement?.querySelector('.guardar-error');
    boton.disabled = true;
    if (destino) destino.textContent = '';
    try {
      const guardada = await cambiarGuardada(boton, id);
      if (guardada !== null && alTerminar) await alTerminar(guardada);
    } catch (error) {
      if (destino) destino.textContent = error.message;
    } finally {
      boton.disabled = false;
    }
  };
}
