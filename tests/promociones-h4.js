// Promociones del catálogo de H4. Las pruebas de H4 a H17 comprueban sus reglas sobre estas cinco;
// el catálogo ampliado de H24 tiene su propia cobertura (catalogo-h24-*.test.js y api-catalogo-h24.test.js).
export const IDS_H4 = ['restaurante', 'tienda', 'cine', 'starbucks', 'siman-black'];
export const soloH4 = lista => lista.filter(promo => IDS_H4.includes(promo.id));
