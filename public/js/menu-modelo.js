export function fechaMensaje(valor) {
  if (!valor) return '';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return '';
  return new Intl.DateTimeFormat('es-SV', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'America/El_Salvador' }).format(fecha);
}

export function partesSaldo(producto, visible) {
  if (!visible) return { entero:'$••••', centavos:'' };
  const partes = new Intl.NumberFormat('es-SV', { style:'currency', currency:producto.moneda }).formatToParts(producto.saldo);
  return {
    entero: partes.filter(p => !['fraction','decimal'].includes(p.type)).map(p => p.value).join(''),
    centavos: partes.filter(p => ['fraction','decimal'].includes(p.type)).map(p => p.value).join('')
  };
}

export function referenciaCuenta(cuenta) {
  return /tarjeta/i.test(cuenta.tipo)
    ? cuenta.numeroEnmascarado
    : cuenta.numeroCompleto || cuenta.numeroEnmascarado;
}

export async function compartirCuenta(cuenta, navegador = navigator) {
  if (!cuenta.numeroCompleto) throw new Error('El número completo de esta cuenta no está disponible.');
  const text = `${cuenta.nombre}\nN.º ${cuenta.numeroCompleto}`;
  if (navegador.share) {
    try { await navegador.share({ title: cuenta.nombre, text }); return 'compartido'; }
    catch (error) { if (error.name === 'AbortError') return 'cancelado'; }
  }
  if (!navegador.clipboard?.writeText) throw new Error('No se pudo copiar. Selecciona el número para compartirlo.');
  await navegador.clipboard.writeText(text);
  return 'copiado';
}
