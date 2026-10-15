import { readStorage, saveStorage } from './comun.js';

const INICIO_LISTO = 'los-extras-inicio-listo';

export function necesitaCargaInicial(storage) {
  return readStorage(storage, INICIO_LISTO) !== '1';
}

export async function prepararInicio({ storage, cargarPerfiles, esperar = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!necesitaCargaInicial(storage)) return { perfiles: [], error: null };
  const tiempo = esperar(2000);
  const consulta = Promise.resolve().then(cargarPerfiles).then(
    perfiles => ({ perfiles, error: null }),
    error => ({ perfiles: [], error })
  );
  const [resultado] = await Promise.all([consulta, tiempo]);
  if (!resultado.error) saveStorage(storage, INICIO_LISTO, '1');
  return resultado;
}

export async function transicionarInicio(carga, acceso, {
  reducirMovimiento = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  indicador, formulario, esperar = ms => new Promise(resolve => setTimeout(resolve, ms))
} = {}) {
  acceso.hidden = false;
  acceso.inert = true;
  if (formulario) formulario.hidden = true;
  const animaciones = [];
  try {
    if (!reducirMovimiento && typeof carga.animate === 'function' && typeof acceso.animate === 'function') {
      animaciones.push(carga.animate([{ opacity:1 }, { opacity:0 }], { duration:260, easing:'ease-out', fill:'forwards' }));
      animaciones.push(acceso.animate([{ opacity:0, transform:'translateY(8px)' }, { opacity:1, transform:'translateY(0)' }], { duration:260, easing:'ease-out', fill:'forwards' }));
      await Promise.allSettled(animaciones.map(a => a.finished));
    }
    carga.hidden = true;
    if (indicador && !reducirMovimiento) {
      indicador.hidden = false;
      await esperar(1000);
    }
  } finally {
    carga.hidden = true;
    if (indicador) indicador.hidden = true;
    if (formulario) formulario.hidden = false;
    acceso.inert = false;
    for (const animacion of animaciones) animacion.cancel();
  }
}
