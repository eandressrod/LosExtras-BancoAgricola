import { perfiles } from '../datos.js';

export function crearRepositorioUsuariosPruebaMock(filas = perfiles) {
  return {
    async listar() { return filas.map(p => ({ ...p })); },
    async marcarApertura(id) {
      const perfil = filas.find(p => p.id === id);
      if (!perfil) return false;
      perfil.promocionesAbiertas = true;
      return true;
    }
  };
}
