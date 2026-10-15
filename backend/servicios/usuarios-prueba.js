export function perfilDePrueba(perfil) {
  return {
    id: perfil.id, nombre: perfil.nombre, tipoTarjeta: perfil.tipoTarjeta,
    usuarioAcceso: perfil.usuarioAcceso ?? null,
    clavePrueba: perfil.clavePrueba ?? null,
    promocionesAbiertas: perfil.promocionesAbiertas === true
  };
}
