// Estados explícitos por propietario para pruebas aisladas y desarrollo sin base.
import fixtures from '../datos-menu.json' with { type: 'json' };
export function crearRepositorioEstadoEncuestaMock(estados = { B: true, ...Object.fromEntries(fixtures.preferencias.map(p => [p.usuarioId, p.completada])) }) {
  return {
    async estaCompletada(usuarioId) {
      return estados[usuarioId] === true;
    }
  };
}
