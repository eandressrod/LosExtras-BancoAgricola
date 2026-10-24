// Sistema visual de Promociones: aviso breve con «Deshacer» (docs/SISTEMA_PROMOCIONES.md).
// Un solo aviso a la vez; el tiempo se detiene mientras el foco o el puntero están dentro (WCAG 2.2.1).

/**
 * @param {HTMLElement} raiz elemento .pr-aviso con .pr-aviso__texto y .pr-aviso__accion
 * @param {{duracion?: number, reloj?: {setTimeout: Function, clearTimeout: Function}}} [opciones]
 */
export function crearAviso(raiz, { duracion = 6000, reloj = globalThis } = {}) {
  const texto = raiz.querySelector('.pr-aviso__texto');
  const accion = raiz.querySelector('.pr-aviso__accion');
  let deshacer = null;
  let temporizador = null;
  let retenido = false;

  function detener() {
    if (temporizador != null) reloj.clearTimeout(temporizador);
    temporizador = null;
  }

  function contar() {
    detener();
    if (!raiz.hidden && !retenido) temporizador = reloj.setTimeout(cerrar, duracion);
  }

  function cerrar() {
    detener();
    deshacer = null;
    raiz.hidden = true;
  }

  function mostrar({ texto: mensaje, accion: etiqueta = 'Deshacer', alDeshacer = null }) {
    deshacer = alDeshacer;
    // Primero se muestra la región y después cambia su texto, para que el lector de pantalla lo anuncie.
    raiz.hidden = false;
    texto.textContent = mensaje;
    accion.textContent = etiqueta;
    accion.hidden = !alDeshacer;
    contar();
  }

  accion.addEventListener('click', () => {
    const pendiente = deshacer;
    cerrar();
    return pendiente?.();
  });
  const retener = () => { retenido = true; detener(); };
  const soltar = () => { retenido = false; contar(); };
  raiz.addEventListener('focusin', retener);
  raiz.addEventListener('focusout', soltar);
  raiz.addEventListener('pointerenter', retener);
  raiz.addEventListener('pointerleave', soltar);

  return { mostrar, cerrar };
}
