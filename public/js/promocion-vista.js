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
