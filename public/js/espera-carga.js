// SCRUM-144: una carga que tarda avisa a los 8 s y se corta a los 20 s con el error de siempre, para poder reintentar.
const AVISO = 8000;
const LIMITE = 20000;

/** Ejecuta operacion(senal): a los 8 s llama alTardar(texto); a los 20 s cancela la señal y rechaza con el error de carga. */
export function conEspera(operacion, { alTardar = () => {}, reloj = globalThis } = {}) {
  const control = new AbortController();
  return new Promise((resolver, rechazar) => {
    const aviso = reloj.setTimeout(() => alTardar('Está tardando más de lo normal…'), AVISO);
    const limite = reloj.setTimeout(() => {
      control.abort();
      rechazar(new Error('No se pudieron cargar los datos. Intenta de nuevo.'));
    }, LIMITE);
    const terminar = () => { reloj.clearTimeout(aviso); reloj.clearTimeout(limite); };
    Promise.resolve().then(() => operacion(control.signal))
      .then(valor => { terminar(); resolver(valor); }, error => { terminar(); rechazar(error); });
  });
}
