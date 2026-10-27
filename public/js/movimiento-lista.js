// H21 (CDA 7): movimiento de la lista en la vista previa. Las tarjetas que cambian de lugar se desplazan y las nuevas
// aparecen; solo se animan la posición y la opacidad, y con movimiento reducido el cambio es instantáneo.

const DURACION_MS = 200;

/**
 * Qué mover y qué hacer aparecer al pasar de un orden a otro, a partir de la posición vertical de cada tarjeta por id.
 * @param {Map<string, number>} antes
 * @param {Map<string, number>} despues
 * @returns {{ mover: {id: string, dy: number}[], entrar: string[] } | null} null si no hay nada que animar
 */
export function desplazamientosLista(antes, despues) {
  if (!antes.size) return null;
  const mover = [];
  const entrar = [];
  for (const [id, arriba] of despues) {
    if (!antes.has(id)) entrar.push(id);
    else if (antes.get(id) !== arriba) mover.push({ id, dy: antes.get(id) - arriba });
  }
  return mover.length || entrar.length ? { mover, entrar } : null;
}

const posicionesDe = (lista, idDe) => new Map([...lista.children].map(elemento => [idDe(elemento), elemento.getBoundingClientRect().top]));

/** Repinta la lista con `pintar` y anima la diferencia con Web Animations. */
export function repintarConMovimiento(lista, idDe, pintar) {
  const antes = posicionesDe(lista, idDe);
  pintar();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cambio = desplazamientosLista(antes, posicionesDe(lista, idDe));
  if (!cambio) return;
  const porId = new Map([...lista.children].map(elemento => [idDe(elemento), elemento]));
  const opciones = { duration: DURACION_MS, easing: 'cubic-bezier(.2, .8, .2, 1)' };
  for (const { id, dy } of cambio.mover) porId.get(id)?.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], opciones);
  for (const id of cambio.entrar) porId.get(id)?.animate([{ opacity: 0 }, { opacity: 1 }], opciones);
}
