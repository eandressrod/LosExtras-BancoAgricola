import { perfiles } from '../datos.js';

// H21 (ADR-010): cada marca de la encuesta y su campo en el perfil.
const CAMPOS_MARCA = { 'hoja-mostrada':'hojaMostrada', 'aviso-cerrado':'avisoCerrado' };

export function crearRepositorioUsuariosPruebaMock(filas = perfiles) {
  return {
    async listar() { return filas.map(p => ({ ...p })); },
    async marcarApertura(id, marca) {
      const perfil = filas.find(p => p.id === id);
      if (!perfil) return null;
      perfil.promocionesAbiertas = true;
      if (marca) perfil[CAMPOS_MARCA[marca]] = true;
      return { promocionesAbiertas:true, hojaMostrada:perfil.hojaMostrada === true, avisoCerrado:perfil.avisoCerrado === true };
    }
  };
}
