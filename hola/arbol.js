export function limitarAncho(ancho, disponible) {
  const maximo = Math.max(125, Math.min(600, disponible - 240));
  return Math.round(Math.max(125, Math.min(maximo, ancho)));
}
export function anchoConTecla(ancho, tecla) {
  return ({ ArrowLeft: ancho - 17, ArrowRight: ancho + 17, Home: 125, End: 600 })[tecla] ?? ancho;
}

export function configurarSeparador(separador, contenido, ventana) {
  let ancho = 215, inicio, inicial;
  const ajustar = valor => {
    ancho = limitarAncho(valor,contenido.getBoundingClientRect().width);
    ventana.style.setProperty('--ancho-arbol', `${ancho}px`);
    separador.setAttribute('aria-valuenow',String(ancho));
    separador.setAttribute('aria-valuemax',String(limitarAncho(600,contenido.getBoundingClientRect().width)));
  };
  separador.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    inicio = e.clientX; inicial = ancho;
    separador.setPointerCapture(e.pointerId); separador.focus(); e.preventDefault();
  });
  separador.addEventListener('pointermove', e => { if (separador.hasPointerCapture(e.pointerId)) ajustar(inicial + e.clientX - inicio); });
  separador.addEventListener('pointerup', e => { if (separador.hasPointerCapture(e.pointerId)) separador.releasePointerCapture(e.pointerId); });
  separador.addEventListener('dblclick', () => ajustar(215));
  separador.addEventListener('keydown', e => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    ajustar(anchoConTecla(ancho,e.key)); e.preventDefault();
  });
  window.addEventListener('resize', () => ajustar(ancho));
  ajustar(ancho);
}
