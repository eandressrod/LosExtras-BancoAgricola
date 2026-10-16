import { readStorage, saveStorage } from './comun.js';

const INICIO_LISTO = 'los-extras-inicio-listo';

export function necesitaCargaInicial(storage) {
  return readStorage(storage, INICIO_LISTO) !== '1';
}

export async function prepararInicio({ storage, cargarPerfiles, minimo = 2000, esperar = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
  if (!necesitaCargaInicial(storage)) return { perfiles: [], error: null };
  const tiempo = esperar(minimo);
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
  indicador, formulario, preparar = async () => undefined,
  esperar = ms => new Promise(resolve => setTimeout(resolve, ms)), vigente = () => true
} = {}) {
  acceso.hidden = false;
  acceso.inert = true;
  if (formulario) formulario.hidden = true;
  if (indicador) indicador.hidden = false;
  const datos = Promise.resolve().then(preparar).then(valor=>({valor}),error=>({error}));
  const animaciones = [];
  let listo = false;
  try {
    if (!reducirMovimiento && typeof carga.animate === 'function' && typeof acceso.animate === 'function') {
      animaciones.push(carga.animate([{ opacity:1 }, { opacity:0 }], { duration:260, easing:'ease-out', fill:'forwards' }));
      animaciones.push(acceso.animate([{ opacity:0 }, { opacity:1 }], { duration:260, easing:'ease-out', fill:'forwards' }));
      await Promise.allSettled(animaciones.map(a => a.finished));
    }
    if (!vigente()) return;
    carga.hidden = true;
    const [resultado] = await Promise.all([datos, indicador && !reducirMovimiento ? esperar(180) : undefined]);
    if (resultado.error) throw resultado.error;
    listo = true;
    return resultado.valor;
  } finally {
    if (vigente()) {
      carga.hidden = true;
      if (indicador) indicador.hidden = true;
      if (formulario && listo) formulario.hidden = false;
    }
    acceso.inert = false;
    for (const animacion of animaciones) animacion.cancel();
  }
}
