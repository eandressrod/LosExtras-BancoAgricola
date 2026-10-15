export function credencialesDePerfil(perfil) {
  return { usuario:perfil.usuarioAcceso ?? '', clave:perfil.clavePrueba ?? '' };
}

export async function registrarAperturaPromociones(peticion = fetch) {
  const respuesta = await peticion('/api/promociones-apertura', { method:'POST' });
  if (!respuesta.ok) throw new Error('No se pudo registrar la apertura de Promociones. Intenta de nuevo.');
}
