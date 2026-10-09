// Genera el hash de una contraseña de prueba para datos mock o una migración.
// Uso: npm run hash -- "ContraseñaDePrueba"
import { generarHash } from '../backend/servicios/contrasenas.js';

const contrasena = process.argv[2];
if (!contrasena) {
  console.error('Uso: npm run hash -- "ContraseñaDePrueba"');
  process.exit(1);
}
console.log(generarHash(contrasena));
