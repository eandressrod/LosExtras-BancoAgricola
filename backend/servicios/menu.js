/** Datos y destino del propietario validado por H1; los fallos no fabrican un estado. */
export async function obtenerDatosMenu(perfil, cuentasRepo, encuestaRepo, preferenciasRepo) {
  let [cuentas, completada] = await Promise.all([
    cuentasRepo.listarPorPerfil(perfil.id),
    encuestaRepo.estaCompletada(perfil.id)
  ]);

  // NUEVO: Sincronización para H3/H4. 
  // Si la encuesta antigua dice que no, pero tenemos el nuevo repositorio inyectado, verificamos ahí.
  if (!completada && preferenciasRepo) {
    const preferencias = await preferenciasRepo.obtenerPreferencias(perfil.id);
    if (preferencias && preferencias.completed) {
      completada = true; // Sincronizamos el estado
    }
  }

  return {
    perfil,
    cuentas,
    encuestaPendiente: !completada,
    destinoPromociones: completada ? '/promociones.html' : '/encuesta.html'
  };
}