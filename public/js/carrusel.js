// Sistema visual de Promociones: carrusel de la franja de avisos (docs/SISTEMA_PROMOCIONES.md).
// crearReproductor decide qué diapositiva toca y cuándo; montarCarrusel la dibuja y escucha al usuario.
// Pausa visible siempre (WCAG 2.2.2) y pausas automáticas con foco, fuera de la vista o con la pestaña oculta.

/**
 * @param {{total: number, intervalo?: number, reducido?: boolean, reloj?: {setTimeout: Function, clearTimeout: Function},
 *   alCambiar?: (estado: {indice: number, reproduciendo: boolean, total: number}) => void}} opciones
 */
export function crearReproductor({ total, intervalo = 5000, reducido = false, reloj = globalThis, alCambiar = () => {} }) {
  let indice = 0;
  let detenido = reducido || total < 2;
  let temporizador = null;
  const retenciones = new Set();
  const reproduciendo = () => !detenido && retenciones.size === 0;
  const estado = () => ({ indice, reproduciendo: reproduciendo(), total });
  const avisar = () => alCambiar(estado());

  function programar() {
    if (temporizador != null) reloj.clearTimeout(temporizador);
    temporizador = reproduciendo() ? reloj.setTimeout(() => { mover(indice + 1); }, intervalo) : null;
  }
  function mover(nuevo) {
    indice = ((nuevo % total) + total) % total;
    programar();
    avisar();
  }
  function cambiarReproduccion(cambio) {
    const antes = reproduciendo();
    cambio();
    if (antes === reproduciendo()) return;
    programar();
    avisar();
  }

  return {
    estado,
    iniciar() { programar(); avisar(); },
    ir: mover,
    siguiente: () => mover(indice + 1),
    anterior: () => mover(indice - 1),
    detener: () => cambiarReproduccion(() => { detenido = true; }),
    reproducir: () => cambiarReproduccion(() => { detenido = total < 2; }),
    retener: motivo => cambiarReproduccion(() => { retenciones.add(motivo); }),
    soltar: motivo => cambiarReproduccion(() => { retenciones.delete(motivo); }),
    parar() { if (temporizador != null) reloj.clearTimeout(temporizador); temporizador = null; }
  };
}

const ROTULOS = {
  vence: 'Vence pronto', ahorro: 'Ahorro de hoy', 'hoy-toca': 'Hoy toca',
  semana: 'Esta semana', guardadas: 'Tus guardadas', orden: 'Tu lista'
};
const UMBRAL_ARRASTRE = 8;

function crear(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  nodo.className = clase;
  if (texto) nodo.textContent = texto;
  return nodo;
}

function crearDiapositiva(diapositiva, href) {
  const nodo = crear(href ? 'a' : 'button', 'pr-diapo');
  if (href) nodo.href = href; else nodo.type = 'button';
  nodo.dataset.tipo = diapositiva.tipo;
  const texto = crear('span', 'pr-diapo__texto');
  texto.append(
    crear('span', 'pr-diapo__rotulo', ROTULOS[diapositiva.tipo] ?? ''),
    crear('strong', 'pr-diapo__titulo', diapositiva.titulo),
    crear('span', 'pr-diapo__detalle', diapositiva.detalle)
  );
  const accion = crear('span', 'pr-diapo__accion', diapositiva.accion.etiqueta ?? '');
  accion.setAttribute('aria-hidden', 'true');
  nodo.append(crear('span', 'pr-diapo__icono'), texto, accion);
  return nodo;
}

/**
 * Dibuja la franja dentro de `raiz` y la pone en marcha.
 * @param {HTMLElement} raiz
 * @param {Array<{tipo: string, titulo: string, detalle: string, accion: object}>} diapositivas
 * @param {{enlace?: (accion: object) => string | null, alPulsar?: (accion: object) => void, intervalo?: number}} [opciones]
 * @returns {{parar: () => void}}
 */
export function montarCarrusel(raiz, diapositivas, { enlace = () => null, alPulsar = () => {}, intervalo = 5000 } = {}) {
  const total = diapositivas.length;
  const reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pista = crear('div', 'pr-franja__pista');
  const progreso = crear('div', 'pr-franja__progreso');
  const pausa = crear('button', 'pr-franja__pausa');
  pausa.type = 'button';
  const segmentos = diapositivas.map(() => crear('span', 'pr-franja__segmento'));
  progreso.setAttribute('aria-hidden', 'true');
  progreso.append(...segmentos);
  const pie = crear('div', 'pr-franja__pie');
  pie.append(progreso, pausa);
  pie.hidden = total < 2;
  let arrastre = null;
  let anularClic = false;

  const nodos = diapositivas.map((diapositiva, indice) => {
    const href = enlace(diapositiva.accion);
    const nodo = crearDiapositiva(diapositiva, href);
    nodo.setAttribute('aria-label', `${ROTULOS[diapositiva.tipo] ?? ''}: ${diapositiva.titulo}. ${diapositiva.detalle}`);
    nodo.addEventListener('click', evento => {
      if (anularClic) { evento.preventDefault(); return; }
      // Tocar una vecina la trae al centro; tocar la del centro hace su acción.
      if (indice !== reproductor.estado().indice) {
        evento.preventDefault();
        reproductor.detener();
        reproductor.ir(indice);
        return;
      }
      if (!href) alPulsar(diapositiva.accion);
    });
    return nodo;
  });
  pista.append(...nodos);
  raiz.replaceChildren(pista, pie);

  function pintar({ indice, reproduciendo }) {
    nodos.forEach((nodo, i) => {
      let distancia = i - indice;
      if (total === 2) distancia = i === indice ? 0 : 1;
      else if (distancia > total / 2) distancia -= total;
      else if (distancia < -total / 2) distancia += total;
      nodo.style.setProperty('--pos', distancia);
      nodo.dataset.pos = distancia === 0 ? 'actual' : Math.abs(distancia) === 1 ? 'vecina' : 'fuera';
      nodo.tabIndex = distancia === 0 ? 0 : -1;
      nodo.setAttribute('aria-hidden', String(distancia !== 0));
    });
    segmentos.forEach((segmento, i) => {
      segmento.dataset.estado = i === indice ? 'activo' : 'pendiente';
      // Un relleno nuevo reinicia la animación de progreso de la diapositiva actual.
      segmento.replaceChildren(...(i === indice ? [crear('span', 'pr-franja__relleno')] : []));
    });
    raiz.dataset.reproduciendo = reproduciendo ? 'si' : 'no';
    pausa.setAttribute('aria-label', reproduciendo ? 'Pausar avisos' : 'Reproducir avisos');
    pista.setAttribute('aria-live', reproduciendo ? 'off' : 'polite');
  }

  const reproductor = crearReproductor({ total, intervalo, reducido, alCambiar: pintar });
  pausa.addEventListener('click', () => (reproductor.estado().reproduciendo ? reproductor.detener() : reproductor.reproducir()));
  raiz.onkeydown = evento => {
    if (evento.key === 'ArrowRight') reproductor.siguiente();
    else if (evento.key === 'ArrowLeft') reproductor.anterior();
    else return;
    evento.preventDefault();
    nodos[reproductor.estado().indice].focus();
  };
  raiz.onfocusin = () => reproductor.retener('foco');
  raiz.onfocusout = evento => { if (!raiz.contains(evento.relatedTarget)) reproductor.soltar('foco'); };
  raiz.onpointerenter = evento => { if (evento.pointerType === 'mouse') reproductor.retener('puntero'); };
  raiz.onpointerleave = () => reproductor.soltar('puntero');

  // Arrastre: la diapositiva sigue al dedo; cambia al pasar el 25 % del ancho o con un gesto rápido.
  pista.onpointerdown = evento => {
    if (!evento.isPrimary || total < 2) return;
    arrastre = { x: evento.clientX, t: evento.timeStamp, dx: 0, activo: false, id: evento.pointerId };
  };
  pista.onpointermove = evento => {
    if (!arrastre || evento.pointerId !== arrastre.id) return;
    arrastre.dx = evento.clientX - arrastre.x;
    if (!arrastre.activo && Math.abs(arrastre.dx) > UMBRAL_ARRASTRE) {
      arrastre.activo = true;
      pista.setPointerCapture(evento.pointerId);
      pista.classList.add('pr-franja__pista--arrastre');
      reproductor.detener();
    }
    if (arrastre.activo) pista.style.setProperty('--arrastre', arrastre.dx + 'px');
  };
  pista.onpointerup = pista.onpointercancel = evento => {
    if (!arrastre) return;
    const { dx, t, activo } = arrastre;
    arrastre = null;
    pista.classList.remove('pr-franja__pista--arrastre');
    pista.style.removeProperty('--arrastre');
    if (!activo) return;
    const rapido = Math.abs(dx) / Math.max(1, evento.timeStamp - t) > 0.5;
    if (dx < 0 && (rapido || -dx > pista.clientWidth * 0.25)) reproductor.siguiente();
    else if (dx > 0 && (rapido || dx > pista.clientWidth * 0.25)) reproductor.anterior();
    else reproductor.ir(reproductor.estado().indice);
    anularClic = true;
    setTimeout(() => { anularClic = false; }, 0);
  };

  const alCambiarVisibilidad = () => (document.hidden ? reproductor.retener('oculta') : reproductor.soltar('oculta'));
  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  const observador = typeof IntersectionObserver === 'function'
    ? new IntersectionObserver(([entrada]) => (entrada.isIntersecting ? reproductor.soltar('vista') : reproductor.retener('vista')), { threshold: 0.4 })
    : null;
  observador?.observe(raiz);
  reproductor.iniciar();

  return {
    parar() {
      reproductor.parar();
      observador?.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    }
  };
}
