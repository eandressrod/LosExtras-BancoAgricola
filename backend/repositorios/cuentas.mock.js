import datosMenu from '../datos-menu.json' with { type: 'json' };

export function crearRepositorioCuentasMock(cuentas = datosMenu.cuentas) {
  return {
    async listarPorPerfil(perfilId) {
      if (!perfilId) return [];
      return structuredClone(cuentas.filter(c => c.perfilId === perfilId && !/tarjeta/i.test(c.tipo)).sort((a,b) => a.orden-b.orden));
    }
  };
}
