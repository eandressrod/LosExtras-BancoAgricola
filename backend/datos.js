// Datos ficticios locales (DATA_SOURCE=mock); reflejan las migraciones de supabase/.
// Las contraseñas de prueba se muestran en el login (public/index.html); aquí solo su hash.
export const perfiles = [
  { id: 'demo', nombre: 'Usuario', tipoTarjeta: 'basica' }, // perfil del esqueleto, sin acceso desde H1
  { id: 'A', nombre: 'Usuario A', tipoTarjeta: 'basica', usuarioAcceso: 'demo.basica',
    contrasenaHash: 'scrypt$VW3bG4vYSj3byjANg1dRfw$jqBaaGdi3tPIScvjLFHTy8vMfktpLmCbRhjxMlPBcIE' },
  { id: 'B', nombre: 'Usuario B', tipoTarjeta: 'black', usuarioAcceso: 'demo.black',
    contrasenaHash: 'scrypt$_19-BdYxD0xaRE5syARVuQ$6rEmOsgu4UhK7kq2oJbz3anp2elDiUrX93jY8Um9B2k' }
];
export const promociones = [
  { id: 'restaurante', merchant: 'Restaurante', category: 'Restaurantes', benefit: '10 % de descuento', description: 'Descuento en una comida.', payment: 'Tarjeta de débito', restrictions: 'Una compra por usuario. No acumulable con otras ofertas.' },
  { id: 'tienda', merchant: 'Tienda', category: 'Compras', benefit: '15 % de descuento', description: 'Descuento en artículos seleccionados.', payment: 'Tarjeta de crédito', restrictions: 'Solo artículos seleccionados. No incluye envío.' },
  { id: 'cine', merchant: 'Cine', category: 'Entretenimiento', benefit: '2 entradas por el precio de 1', description: 'Beneficio para una función.', payment: 'Tarjeta de débito o crédito', restrictions: 'Sujeto a disponibilidad. No aplica a funciones especiales.' }
];
