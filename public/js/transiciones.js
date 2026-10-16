import { readStorage, saveStorage } from './comun.js';
import { conMinimoCarga } from './carga-tiempo.js';

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
  storage = sessionStorage, navegar = url => location.replace(url), modo = 'carga'
} = {}) {
  saveStorage(storage, ENTRADA_MENU, modo);
  // El destino consume el marcador para animar una sola entrada al menú.
  navegar('/menu.html');
}

export async function animarEntradaMenu(pantalla, { storage = sessionStorage, reducirMovimiento = movimientoReducido(),
  cubierta,
  revelar = () => { if (typeof document !== 'undefined') document.documentElement.removeAttribute('data-entrada-menu'); }
} = {}) {
  const modo = readStorage(storage, ENTRADA_MENU);
  if (!modo) return;
  saveStorage(storage, ENTRADA_MENU, null);
  if (cubierta && ['carga','fade'].includes(modo)) {
    cubierta.hidden = false;
    revelar();
    if (modo === 'fade') await retirarCarga(cubierta, { reducirMovimiento });
    else {
      try { await deslizar(cubierta, [{transform:'translateX(0)'},{transform:'translateX(100%)'}], reducirMovimiento); }
      finally { cubierta.hidden = true; }
    }
    return;
  }
  if (typeof document !== 'undefined' && document.documentElement.dataset.transicionNativa === '1') { revelar(); return; }
  await animarPantalla(pantalla, { reducirMovimiento, revelar });
}

export async function mostrarCargaAcceso(pantalla, carga, { reducirMovimiento = movimientoReducido() } = {}) {
  pantalla.inert = true;
  carga.hidden = false;
  let animacion;
  try {
    if (!reducirMovimiento && pantalla.animate) {
      animacion = pantalla.animate([{opacity:1},{opacity:0}], {duration:260,easing:'ease-out',fill:'forwards'});
      await animacion.finished.catch(() => {});
    }
    pantalla.hidden = true;
  } finally { animacion?.cancel(); pantalla.inert = false; }
}

export async function retirarCarga(cubierta, { reducirMovimiento = movimientoReducido(), vigente = () => true } = {}) {
  let animacion;
  try {
    if (!reducirMovimiento && cubierta.animate) {
      animacion = cubierta.animate([{opacity:1},{opacity:0}], {duration:260,easing:'ease-out',fill:'forwards'});
      await animacion.finished.catch(() => {});
    }
  } finally { if (vigente()) cubierta.hidden = true; animacion?.cancel(); }
}

export async function animarPantalla(pantalla, { reducirMovimiento = movimientoReducido(), revelar = () => {} } = {}) {
  await deslizar(pantalla, [{ transform:'translateX(100%)' }, { transform:'translateX(0)' }], reducirMovimiento, revelar);
}

export async function conIndicador(indicador, operacion, opciones) {
  indicador.hidden = false;
  try { return await conMinimoCarga(operacion, opciones); }
  finally { indicador.hidden = true; }
}

export async function regresarEnVentana(operacion, { documento = document, reducirMovimiento = movimientoReducido() } = {}) {
  documento.documentElement.dataset.direccion = 'volver';
  try {
    if (!reducirMovimiento && documento.startViewTransition) {
      const transicion = documento.startViewTransition(operacion);
      transicion.ready.catch(() => {});
      await transicion.finished.catch(() => {});
    } else await operacion();
  } finally { delete documento.documentElement.dataset.direccion; }
}

export async function programarRetiroAviso(aviso, { esperar = ms => new Promise(resolve => setTimeout(resolve,ms)), reducirMovimiento = movimientoReducido() } = {}) {
  const version = Symbol(); aviso.avisoActual = version;
  await esperar(4000);
  if (aviso.hidden || aviso.avisoActual !== version) return;
  let animacion;
  try {
    if (!reducirMovimiento && aviso.animate) {
      animacion = aviso.animate([{opacity:1},{opacity:0}],{duration:1000,easing:'ease-out',fill:'forwards'});
      await animacion.finished.catch(() => {});
    }
  } finally { if (aviso.avisoActual === version) aviso.hidden = true; animacion?.cancel(); }
}
