// Estados explícitos por propietario para pruebas aisladas y desarrollo sin base.
export function crearRepositorioEstadoEncuestaMock(estados = { B: true }) {
  return {
    async estaCompletada(usuarioId) {
      return estados[usuarioId] === true;
    }
  };
}
