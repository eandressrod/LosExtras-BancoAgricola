export function errorDatos(mensaje, estado = 400) {
  return Object.assign(new Error(mensaje), { estado });
}

export function validarMeta(cuerpo) {
  const { nombre, objetivo, ahorrado = 0 } = cuerpo ?? {};
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.trim().length > 60) throw errorDatos('Escribe un nombre de hasta 60 caracteres.');
  if (typeof objetivo !== 'number' || !Number.isFinite(objetivo) || objetivo <= 0 || objetivo > 9999999999.99) throw errorDatos('Escribe un objetivo mayor que cero.');
  if (typeof ahorrado !== 'number' || !Number.isFinite(ahorrado) || ahorrado < 0 || ahorrado > objetivo) throw errorDatos('El ahorro debe estar entre cero y el objetivo.');
  if ([objetivo, ahorrado].some(n => Math.abs(n * 100 - Math.round(n * 100)) > 0.0001)) throw errorDatos('Usa como máximo dos decimales.');
  return { nombre: nombre.trim(), objetivo, ahorrado, moneda: 'USD' };
}

export const progresoMeta = meta => Math.min(100, Math.round(meta.ahorrado / meta.objetivo * 100));

export function validarId(id) {
  if (typeof id !== 'string' || !id.trim() || id.length > 100) throw errorDatos('El registro no es válido.');
  return id;
}
