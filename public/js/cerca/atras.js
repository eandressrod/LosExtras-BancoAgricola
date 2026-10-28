// H8: el «atrás» del sistema (gesto o botón de Android, también en la PWA) cierra el mapa ampliado en vez de salir de
// Promociones. Al ampliar se añade una entrada al historial; cerrar con el botón o Esc la deshace.

/** @param {History} historial @param {() => void} alVolver cierra el mapa cuando el sistema retrocede. */
export function controlarAtras(historial, alVolver) {
  let activo = false;
  return {
    abrir() {
      if (activo) return;
      activo = true;
      historial.pushState({ ...historial.state, mapaAmpliado: true }, '');
    },
    cerrar() {
      if (!activo) return;
      activo = false;
      historial.back();
    },
    /** Para el evento popstate: true si cerró el mapa. */
    alNavegar() {
      if (!activo) return false;
      activo = false;
      alVolver();
      return true;
    }
  };
}
