// SCRUM-142: un enlace de «volver» regresa en el historial cuando la página anterior es su destino, en vez de apilar
// otra entrada; así el Atrás del sistema sigue llevando a donde se venía. Si se llegó de otra página, navega como siempre.

/** @param {HTMLAnchorElement} enlace @param {{documento?: Document, historial?: History}} [entorno] */
export function volverConHistorial(enlace, { documento = document, historial = history } = {}) {
  enlace.addEventListener('click', evento => {
    if (historial.length < 2 || !mismaPagina(documento.referrer, enlace.href)) return;
    evento.preventDefault();
    historial.back();
  });
}

function mismaPagina(anterior, destino) {
  try {
    const desde = new URL(anterior);
    const hacia = new URL(destino);
    return desde.origin === hacia.origin && desde.pathname === hacia.pathname;
  } catch {
    return false;
  }
}
