import { readStorage, saveStorage } from './comun.js';

const ENTRADA_MENU = 'los-extras-entrada-menu';
const movimientoReducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

async function deslizar(pantalla, fotogramas, reducirMovimiento, alIniciar = () => {}) {
  pantalla.inert = true;
  let animacion;
  try {
    if (!reducirMovimiento && typeof pantalla.animate === 'function') {
      animacion = pantalla.animate(fotogramas, { duration:320, easing:'cubic-bezier(.25,.1,.25,1)', fill:'forwards' });
      alIniciar();
      await animacion.finished.catch(() => {});
    } else alIniciar();
  } finally {
    pantalla.inert = false;
    animacion?.cancel();
  }
}

export async function deslizarHaciaMenu(pantalla, {
  storage = sessionStorage, navegar = url => location.replace(url), reducirMovimiento = movimientoReducido()
} = {}) {
  saveStorage(storage, ENTRADA_MENU, '1');
  await deslizar(pantalla, [{ transform:'translateX(0)' }, { transform:'translateX(100%)' }], reducirMovimiento);
  navegar('/menu.html');
}

export async function animarEntradaMenu(pantalla, { storage = sessionStorage, reducirMovimiento = movimientoReducido(),
  revelar = () => { if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-entrada-menu'); }
} = {}) {
  if (readStorage(storage, ENTRADA_MENU) !== '1') return;
  saveStorage(storage, ENTRADA_MENU, null);
  await deslizar(pantalla, [{ transform:'translateX(-100%)' }, { transform:'translateX(0)' }], reducirMovimiento, revelar);
}

export async function conIndicador(indicador, operacion) {
  indicador.hidden = false;
  try { return await operacion(); }
  finally { indicador.hidden = true; }
}
