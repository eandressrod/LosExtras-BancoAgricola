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

// Lunes a domingo (domingo = 0), en singular y en plural: «de lunes a sábado», «los sábados».
const SEMANA = [
  [1, 'lunes', 'lunes'], [2, 'martes', 'martes'], [3, 'miércoles', 'miércoles'], [4, 'jueves', 'jueves'],
  [5, 'viernes', 'viernes'], [6, 'sábado', 'sábados'], [0, 'domingo', 'domingos']
];
const mayuscula = texto => texto.charAt(0).toUpperCase() + texto.slice(1);
const unir = nombres => nombres.length === 1 ? nombres[0] : nombres.slice(0, -1).join(', ') + ' y ' + nombres.at(-1);

/**
 * Forma de los días fijos, ordenados de lunes a domingo: un día, un rango (tres o más seguidos) o una lista.
 * null si no hay días fijos o están los siete. La usan la tarjeta, el detalle y la franja de avisos.
 * @returns {{ forma: 'uno' | 'rango' | 'lista', plurales: string[], desde: string, hasta: string } | null}
 */
export function formaDias(dias) {
  if (!dias?.length) return null;
  const elegidos = SEMANA.filter(([numero]) => dias.includes(numero));
  if (elegidos.length === SEMANA.length) return null;
  const posiciones = elegidos.map(dia => SEMANA.indexOf(dia));
  const seguidos = posiciones.every((posicion, indice) => indice === 0 || posicion === posiciones[indice - 1] + 1);
  const forma = elegidos.length === 1 ? 'uno' : seguidos && elegidos.length > 2 ? 'rango' : 'lista';
  return { forma, plurales: elegidos.map(dia => dia[2]), desde: elegidos[0][1], hasta: elegidos.at(-1)[1] };
}

/** Frase corta de los días válidos: «Todos los miércoles», «Sábados y domingos», «Lunes a jueves» o «Todos los días». */
export function textoDias(dias) {
  const partes = formaDias(dias);
  if (!partes) return 'Todos los días';
  if (partes.forma === 'uno') return 'Todos los ' + partes.plurales[0];
  return mayuscula(partes.forma === 'rango' ? `${partes.desde} a ${partes.hasta}` : unir(partes.plurales));
}

/** Los días con artículo, para «Disponible los miércoles» o «Disponible de lunes a jueves». */
function diasConArticulo(dias) {
  const partes = formaDias(dias);
  return partes.forma === 'rango' ? `de ${partes.desde} a ${partes.hasta}` : 'los ' + unir(partes.plurales);
}

/**
 * Aviso de días de la tarjeta y del detalle (reloj). 'hoy' si aplica hoy; 'otro-dia' si está vigente pero hoy no
 * es uno de sus días; 'neutro' fuera de vigencia o sin disponibilidad confirmada, donde solo se dicen los días.
 */
export function estadoDias(promo) {
  const vigente = (promo.canUse ?? !(promo.expired || promo.upcoming)) && !promo.vencida;
  if (vigente && promo.availableToday) {
    const dias = textoDias(promo.usageDays);
    return { estado: 'hoy', texto: 'Disponible hoy · ' + dias.charAt(0).toLowerCase() + dias.slice(1) };
  }
  if (vigente && formaDias(promo.usageDays)) return { estado: 'otro-dia', texto: 'Disponible ' + diasConArticulo(promo.usageDays) };
  return { estado: 'neutro', texto: textoDias(promo.usageDays) };
}

const CANALES = { presencial: 'en tienda', delivery: 'a domicilio', 'en-linea': 'en línea' };

/** Detalle: cómo usar la promoción, solo con datos del catálogo. Las instrucciones propias de la promoción van al final. */
export function pasosDeUso(promo) {
  const canales = (promo.channels ?? []).map(canal => CANALES[canal]).filter(Boolean);
  const cuando = formaDias(promo.usageDays) ? 'Úsala ' + diasConArticulo(promo.usageDays) : 'Úsala cualquier día';
  const pasos = [
    { tipo: 'comercio', texto: `Compra en ${promo.merchant}` + (canales.length ? ', ' + unir(canales).replace(/ y (?=[^y]*$)/, ' o ') : '') },
    { tipo: 'dias', texto: cuando + (promo.validUntil && !promo.expired ? ', hasta el ' + fecha(promo.validUntil) : '') },
    { tipo: 'tarjeta', texto: 'Paga con tu tarjeta ' + (promo.applicableCard === 'black' ? 'Black' : 'Básica') }
  ];
  const montos = [
    promo.minimumPurchase != null && 'Compra mínima de ' + dinero.format(promo.minimumPurchase),
    promo.discountCap != null && 'descuento hasta ' + dinero.format(promo.discountCap)
  ].filter(Boolean);
  if (montos.length) pasos.push({ tipo: 'monto', texto: mayuscula(montos.join(' · ')) });
  if (promo.instructions) pasos.push({ tipo: 'nota', texto: promo.instructions });
  return pasos;
}

export function condicionesVisibles(promo, { dias: conDias = true, restricciones = true } = {}) {
  const condiciones = [];
  if (conDias && promo.usageDays?.length) {
    const diasOrdenados = [...new Set(promo.usageDays)].sort();
    condiciones.push(diasOrdenados.join() === '1,2,3,4' ? 'Lunes a jueves' : diasOrdenados.map(dia => dias[dia]).join(', ').toLowerCase().replace(/^./, letra => letra.toUpperCase()));
  }
  if (promo.minimumPurchase != null) condiciones.push('Compra mínima: ' + dinero.format(promo.minimumPurchase));
  if (promo.discountCap != null) condiciones.push('Tope de descuento: ' + dinero.format(promo.discountCap));
  if (restricciones && promo.restrictions) condiciones.push(promo.restrictions);
  return condiciones;
}

/** Restricciones de la tarjeta (restrictions) y generales de la promoción (generalRestrictions), sin repetir. */
export function restriccionesDe(promo) {
  return [...new Set([promo.restrictions, promo.generalRestrictions].filter(Boolean))];
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

export function mostrarCondiciones(lista, promo, opciones) {
  lista.replaceChildren();
  for (const texto of condicionesVisibles(promo, opciones)) {
    const item = document.createElement('li');
    item.textContent = texto;
    lista.append(item);
  }
  lista.hidden = lista.children.length === 0;
}

/** Detalle: lista de restricciones de «Cómo usarla»; se oculta si la promoción no trae ninguna. */
export function mostrarRestricciones(lista, promo) {
  lista.replaceChildren(...restriccionesDe(promo).map(texto => {
    const item = document.createElement('li');
    item.textContent = texto;
    return item;
  }));
  lista.hidden = lista.children.length === 0;
}

/** Detalle: dibuja los pasos de uso; el tipo elige el icono y la nota final se distingue de los pasos numerados. */
export function mostrarPasos(lista, promo) {
  lista.replaceChildren();
  for (const { tipo, texto } of pasosDeUso(promo)) {
    const item = document.createElement('li');
    item.className = 'pr-paso';
    item.dataset.tipo = tipo;
    item.textContent = texto;
    lista.append(item);
  }
}

/** Día de la semana (domingo = 0) de una fecha civil AAAA-MM-DD. */
export function diaDeLaSemana(fecha) {
  return new Date(fecha + 'T12:00:00Z').getUTCDay();
}

/** Aviso de días con reloj: verde si aplica hoy, rojo si es otro día, neutro fuera de vigencia. */
export function mostrarDias(elemento, promo) {
  const { estado, texto } = estadoDias(promo);
  elemento.textContent = texto;
  elemento.dataset.estado = estado;
}

const NOMBRE_TARJETA = { basica: 'Básica', black: 'Black' };

/** Todas las tarjetas (SCRUM-133): menciona otra tarjeta propia solo si su beneficio es distinto al mejor. */
export function textoOtrasTarjetas(promo) {
  const mejor = promo.mejorBeneficio;
  if (!mejor) return '';
  const vistos = new Set([mejor.tipoTarjeta + '|' + mejor.texto]);
  const otros = (promo.otrosBeneficios ?? []).filter(beneficio => {
    const clave = beneficio.tipoTarjeta + '|' + beneficio.texto;
    if (vistos.has(clave) || beneficio.texto === mejor.texto) return false;
    vistos.add(clave);
    return true;
  });
  return otros.map(beneficio => `También ${beneficio.texto} con tu ${NOMBRE_TARJETA[beneficio.tipoTarjeta] ?? beneficio.tipoTarjeta}`).join(' · ');
}
