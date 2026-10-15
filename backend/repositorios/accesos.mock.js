import { perfiles } from '../datos.js';

// Repositorio de accesos con datos locales; mismo contrato que accesos.supabase.js.
const aPerfil = ({ id, nombre, tipoTarjeta }) => ({ id, nombre, tipoTarjeta });
const sesionesRevocadas = new Set();
const actividades = new Map();

export async function estadoActividad(sesion, renovar = false) {
  const ahora = Date.now();
  const anterior = actividades.get(sesion.id) ?? sesion.creadaEn;
  if (ahora >= Math.min(anterior + 120000, sesion.expiraEn * 1000)) return null;
  const ultima = renovar ? ahora : anterior;
  actividades.set(sesion.id, ultima);
  return { ahora, inactivaEn: Math.min(ultima + 120000, sesion.expiraEn * 1000) };
}

/** @type {import('./contrato.js').RepositorioAccesos['buscarAccesoPorUsuario']} */
export async function buscarAccesoPorUsuario(usuario) {
  const perfil = perfiles.find(item => item.usuarioAcceso === usuario);
  return perfil ? { ...aPerfil(perfil), contrasenaHash: perfil.contrasenaHash } : null;
}

/** @type {import('./contrato.js').RepositorioAccesos['buscarPerfilPorId']} */
export async function buscarPerfilPorId(id) {
  const perfil = perfiles.find(item => item.id === id);
  return perfil ? aPerfil(perfil) : null;
}

// Solo pruebas/desarrollo mock. Supabase conserva revocaciones entre instancias.
export async function sesionRevocada(id) {
  return sesionesRevocadas.has(id);
}

export async function revocarSesion({ id }) {
  sesionesRevocadas.add(id);
}
