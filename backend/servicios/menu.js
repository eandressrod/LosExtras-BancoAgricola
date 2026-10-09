/** Datos y destino del propietario validado por H1; los fallos no fabrican un estado. */
export async function obtenerDatosMenu(perfil, cuentasRepo, encuestaRepo) {
  const [cuentas, completada] = await Promise.all([
    cuentasRepo.listarPorPerfil(perfil.id),
    encuestaRepo.estaCompletada(perfil.id)
  ]);
  return {
    perfil,
    cuentas,
    encuestaPendiente: !completada,
    destinoPromociones: completada ? '/promociones.html' : '/encuesta.html'
  };
}
