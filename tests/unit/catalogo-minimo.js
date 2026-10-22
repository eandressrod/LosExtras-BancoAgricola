// Catálogo mínimo válido según el contrato de H24, para probar el esquema, el validador y sus adaptaciones.
export const OCASIONES = ['dia-a-dia', 'rapido-practico', 'darse-un-gusto', 'salir', 'familia', 'bienestar',
  'entretenimiento', 'estilo-personal', 'tecnologia', 'hogar', 'viajes'];

export const vector = (valores = {}) => Object.fromEntries(OCASIONES.map(id => [id, valores[id] ?? 0]));

export function catalogoMinimo() {
  return {
    version: 1,
    ocasiones: OCASIONES.map((id, indice) => ({ id, nombre: `Ocasión ${indice + 1}`, ejemplos: 'Ejemplos', orden: indice + 1 })),
    rubrica: [
      { valor: 1, definicion: 'La oferta gira en torno a esa ocasión.', ejemplo: 'Un combo familiar para Planes en familia.' },
      { valor: 0.5, definicion: 'La oferta incluye esa ocasión en parte.', ejemplo: 'Un restaurante de mesa para Salir con amigos o pareja.' },
      { valor: 0, definicion: 'La ocasión no aplica a la oferta.', ejemplo: 'Una farmacia para Viajes y escapadas.' }
    ],
    etiquetasIntencion: [{ id: 'regalo', nombre: 'Regalo' }],
    zonas: [
      { id: 'escalon', nombre: 'Escalón', centro: { latitud: 13.7058, longitud: -89.2445 } },
      { id: 'santa-tecla', nombre: 'Santa Tecla', centro: { latitud: 13.6740, longitud: -89.2860 } }
    ],
    categorias: [
      { id: 'Restaurantes', nombre: 'Restaurantes', icono: '/recursos/categorias/restaurantes.svg', imagen: null, orden: 1 },
      { id: 'Salud', nombre: 'Salud', icono: '/recursos/categorias/salud.svg', imagen: '/recursos/categorias/salud.webp', orden: 2 }
    ],
    subcategorias: [
      { id: 'pizzerias', nombre: 'Pizzerías', categoria: 'Restaurantes' },
      { id: 'comida-rapida', nombre: 'Comida rápida', categoria: 'Restaurantes' },
      { id: 'farmacias', nombre: 'Farmacias', categoria: 'Salud' }
    ],
    comercios: [
      { id: 'hamburguesas', nombre: "Hamburguesas D'Juan", logo: '/recursos/comercios/hamburguesas.png', categoria: 'Restaurantes',
        subcategoria: 'comida-rapida', ocasiones: vector({ 'rapido-practico': 1, salir: 0.5 }), nivelPrecio: 1,
        reconocible: true, sensible: false, afinarPor: 'comercio' },
      { id: 'farmacia', nombre: 'Farmacia', logo: '/recursos/comercios/farmacia.svg', categoria: 'Salud',
        subcategoria: 'farmacias', ocasiones: {}, nivelPrecio: 2, reconocible: true, sensible: true, afinarPor: 'subcategoria' }
    ],
    sucursales: [
      { id: 'hamburguesas-escalon', comercio: 'hamburguesas', nombre: 'Escalón', direccion: 'Paseo General Escalón',
        coordenadas: { latitud: 13.7051, longitud: -89.2421 }, zona: 'escalon' },
      { id: 'hamburguesas-santa-tecla', comercio: 'hamburguesas', nombre: 'Santa Tecla', direccion: 'Paseo El Carmen',
        coordenadas: { latitud: 13.6735, longitud: -89.2869 }, zona: 'santa-tecla' },
      { id: 'farmacia-escalon', comercio: 'farmacia', nombre: 'Escalón', direccion: 'Calle El Mirador',
        coordenadas: { latitud: 13.7069, longitud: -89.2430 }, zona: 'escalon' }
    ],
    cobertura: [
      { comercio: 'hamburguesas', zona: 'santa-tecla', estado: 'si' },
      { comercio: 'hamburguesas', zona: 'escalon', estado: 'desconocida' }
    ],
    relaciones: [],
    promociones: [
      { id: 'combo', comercio: 'hamburguesas', titulo: 'Combo con descuento', descripcion: 'Tu combo favorito con descuento.',
        descripcionDetalle: 'Pide tu combo favorito en restaurante o a domicilio y paga con tu tarjeta para recibir el descuento.',
        condiciones: 'Aplica en combos de la carta.', restricciones: 'No acumulable con otras ofertas.',
        instrucciones: 'Paga con tu tarjeta al ordenar.', imagen: '/recursos/promociones/combo.webp', textoAlternativo: 'Hamburguesa con papas',
        beneficios: [
          { tarjeta: 'basica', beneficio: '10 % de descuento', medioPago: 'Tarjeta Básica', restricciones: '', compraMinima: null, tope: null },
          { tarjeta: 'black', beneficio: '20 % de descuento', medioPago: 'Tarjeta Black', restricciones: '', compraMinima: 10, tope: 5 }
        ],
        vigencia: { desde: '2026-10-01', hasta: '2026-12-31' }, dias: null, canales: ['presencial', 'delivery'],
        condicionDecisiva: 'Pagar con tu tarjeta', tipoBeneficio: 'descuento', etiquetasIntencion: [], alta: '2026-10-01' },
      { id: 'vitaminas', comercio: 'farmacia', titulo: 'Vitaminas en cuotas', descripcion: 'Tus vitaminas en tres cuotas.',
        descripcionDetalle: 'Compra vitaminas y suplementos seleccionados y págalos en tres cuotas sin intereses con tu tarjeta Black.',
        condiciones: 'Productos seleccionados.', restricciones: 'No aplica a medicamentos con receta.',
        instrucciones: 'Solicita las cuotas en caja.', imagen: '/recursos/promociones/vitaminas.webp', textoAlternativo: 'Frascos de vitaminas',
        beneficios: [
          { tarjeta: 'black', beneficio: '3 cuotas sin intereses', medioPago: 'Tarjeta Black', restricciones: '', compraMinima: 30, tope: null }
        ],
        vigencia: { desde: '2026-10-01', hasta: '2026-12-31' }, dias: [1, 2, 3], canales: ['presencial'], sucursales: ['farmacia-escalon'],
        condicionDecisiva: 'Compra mínima de $30', tipoBeneficio: 'cuotas-sin-intereses', etiquetasIntencion: ['regalo'], alta: '2026-10-02',
        nivelPrecio: 3 }
    ]
  };
}
