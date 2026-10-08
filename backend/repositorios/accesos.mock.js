import { perfiles } from '../datos.js';

// Repositorio de accesos con datos locales; mismo contrato que accesos.supabase.js.
const aPerfil = ({ id, nombre, tipoTarjeta }) => ({ id, nombre, tipoTarjeta });

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
