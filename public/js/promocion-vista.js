const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const dias = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const dinero = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const fecha = valor => {
  const [year, month, day] = valor.split('-').map(Number);
  return `${day} ${meses[month - 1]} ${year}`;
};

export function textoVigencia(promo) {
  if (promo.upcoming && promo.validFrom) return 'Disponible desde el ' + fecha(promo.validFrom);
  if (!promo.validUntil) return '';
  return (promo.expired ? 'Venció el ' : 'Válida hasta el ') + fecha(promo.validUntil);
}

const fechaCivil = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/El_Salvador', year: 'numeric', month: '2-digit', day: '2-digit' });
const DIA_MS = 86400000;

/** Fecha civil de El Salvador (AAAA-MM-DD), la misma referencia que usa la API para «hoy». */
export function hoyEnElSalvador(ahora = new Date()) {
  return fechaCivil.format(ahora);
}

/** Sistema visual: aviso de vigencia corta, solo con 7 días o menos y fechas reales del catálogo. */
export function textoVencePronto(promo, hoy) {
  if (!promo.validUntil || promo.expired || promo.upcoming) return '';
  const dias = Math.round((Date.parse(promo.validUntil) - Date.parse(hoy)) / DIA_MS);
  if (dias < 0 || dias > 7) return '';
  if (dias === 0) return 'Vence hoy';
  return dias === 1 ? 'Vence mañana' : `Vence en ${dias} días`;
}

/** H17: por qué se puede usar hoy. No afirma que ya se cumpla una compra mínima. */
export function textoDisponibleHoy(promo) {
  if (!promo.availableToday) return '';
  const motivo = promo.usageDays?.length ? 'es uno de sus días válidos' : 'aplica todos los días de su vigencia';
  return `Disponible hoy: ${motivo}${promo.minimumPurchase != null ? ', con la compra mínima indicada' : ''}.`;
}

export function condicionesVisibles(promo) {
  const condiciones = [];
  if (promo.usageDays?.length) {
    const diasOrdenados = [...new Set(promo.usageDays)].sort();
    condiciones.push(diasOrdenados.join() === '1,2,3,4' ? 'Lunes a jueves' : diasOrdenados.map(dia => dias[dia]).join(', ').toLowerCase().replace(/^./, letra => letra.toUpperCase()));
  }
  if (promo.minimumPurchase != null) condiciones.push('Compra mínima: ' + dinero.format(promo.minimumPurchase));
  if (promo.discountCap != null) condiciones.push('Tope de descuento: ' + dinero.format(promo.discountCap));
  if (promo.restrictions) condiciones.push(promo.restrictions);
  return condiciones;
}

export function mostrarImagen(img, url, alt = '') {
  img.alt = alt;
  const permitida = typeof url === 'string' && (/^\/recursos\//.test(url) || /^https:\/\//.test(url));
  img.hidden = !permitida;
  if (permitida) {
    img.addEventListener('error', () => { img.hidden = true; }, { once: true });
    img.src = url;
  }
}

export function mostrarCondiciones(lista, promo) {
  lista.replaceChildren();
  for (const texto of condicionesVisibles(promo)) {
    const item = document.createElement('li');
    item.textContent = texto;
    lista.append(item);
  }
  lista.hidden = lista.children.length === 0;
}
