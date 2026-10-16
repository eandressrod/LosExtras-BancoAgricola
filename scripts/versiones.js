// Asociación entre versiones publicadas (PR fusionado en main) y la última migración que exigen.
// El manifiesto vive en supabase/versiones.json; ver la guía técnica, sección «Versiones y regreso».

export function versionDeMigracion(archivo) {
  return archivo.slice(0, 14);
}

export function validarManifiesto(manifiesto, migraciones) {
  const errores = [];
  const disponibles = new Set(migraciones.map(versionDeMigracion));
  const versiones = manifiesto?.versiones ?? [];
  if (!versiones.length) errores.push('El manifiesto no tiene versiones.');
  let regresoIniciado = false;
  versiones.forEach((version, indice) => {
    const anterior = versiones[indice - 1];
    const nombre = `PR ${version.pr}`;
    if (anterior && version.pr <= anterior.pr) errores.push(`${nombre}: fuera de orden respecto a PR ${anterior.pr}.`);
    if (!/^[0-9a-f]{40}$/.test(version.commit ?? '')) errores.push(`${nombre}: commit debe ser un SHA completo.`);
    if (!disponibles.has(version.migracion)) errores.push(`${nombre}: no existe la migración ${version.migracion}.`);
    if (anterior && version.migracion < anterior.migracion) {
      errores.push(`${nombre}: la migración no puede ser anterior a la de PR ${anterior.pr}.`);
    }
    if (typeof version.regreso !== 'boolean') errores.push(`${nombre}: regreso debe ser true o false.`);
    if (version.regreso) regresoIniciado = true;
    else if (regresoIniciado) errores.push(`${nombre}: regreso deshabilitado después de una versión con regreso.`);
  });
  return errores;
}

// Versión en producción a la que debe poder volver Vercel después de aplicar las migraciones actuales.
export function destinoRegreso(manifiesto) {
  return manifiesto.versiones.at(-1)?.regreso ? manifiesto.versiones.at(-1) : null;
}

export function migracionesPendientes(manifiesto, migraciones) {
  const ultima = manifiesto.versiones.at(-1)?.migracion ?? '';
  return migraciones.filter(archivo => versionDeMigracion(archivo) > ultima);
}
