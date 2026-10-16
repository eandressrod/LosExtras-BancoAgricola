// Prueba de regreso: ejecuta la suite de la versión en producción (destino de regreso del manifiesto)
// contra las migraciones actuales. Si pasa, Vercel puede volver a esa versión sin tocar la base.
// Uso: npm run test:regreso   (requiere el historial de git con el commit del manifiesto)
import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, readFile, rm, rmdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { destinoRegreso, migracionesPendientes, validarManifiesto, versionDeMigracion } from './versiones.js';

const raiz = fileURLToPath(new URL('..', import.meta.url));
const carpetaMigraciones = path.join(raiz, 'supabase', 'migrations');

function ejecutar(comando, argumentos, opciones = {}) {
  const resultado = spawnSync(comando, argumentos, { stdio: 'inherit', shell: process.platform === 'win32', ...opciones });
  if (resultado.error) throw resultado.error;
  return resultado.status;
}

const listarMigraciones = async carpeta => (await readdir(carpeta)).filter(nombre => nombre.endsWith('.sql')).sort();

const manifiesto = JSON.parse(await readFile(path.join(raiz, 'supabase', 'versiones.json'), 'utf8'));
const migraciones = await listarMigraciones(carpetaMigraciones);
const errores = validarManifiesto(manifiesto, migraciones);
if (errores.length) {
  console.error(`Manifiesto inválido:\n- ${errores.join('\n- ')}`);
  process.exit(1);
}
const destino = destinoRegreso(manifiesto);
if (!destino) {
  console.log('Sin versión destino de regreso en supabase/versiones.json.');
  process.exit(0);
}

// Dentro del proyecto para que la copia resuelva node_modules; .regreso/ está en .gitignore.
const copia = path.join(raiz, '.regreso', `pr-${destino.pr}`);
let estado = 1;
try {
  await rm(copia, { recursive: true, force: true });
  await mkdir(copia, { recursive: true });
  const archivoTar = path.join(copia, 'version.tar');
  if (ejecutar('git', ['archive', '--format=tar', '-o', archivoTar, destino.commit], { cwd: raiz }) !== 0) {
    throw new Error(`No se encontró el commit ${destino.commit}; obtener el historial completo (fetch-depth: 0).`);
  }
  if (ejecutar('tar', ['-xf', 'version.tar'], { cwd: copia }) !== 0) throw new Error('No se pudo extraer la versión.');
  await rm(archivoTar);

  const migracionesCopia = path.join(copia, 'supabase', 'migrations');
  const propia = (await listarMigraciones(migracionesCopia)).at(-1);
  if (versionDeMigracion(propia) !== destino.migracion) {
    throw new Error(`PR ${destino.pr} termina en ${propia}, pero el manifiesto indica ${destino.migracion}.`);
  }
  await rm(migracionesCopia, { recursive: true });
  await cp(carpetaMigraciones, migracionesCopia, { recursive: true });

  const pendientes = migracionesPendientes(manifiesto, migraciones);
  console.log(`Regreso a PR ${destino.pr} (${destino.commit.slice(0, 7)}) con ${pendientes.length} migración(es) nueva(s):`);
  pendientes.forEach(archivo => console.log(`  ${archivo}`));
  estado = ejecutar('npm', ['test'], { cwd: copia });
  console.log(estado === 0
    ? `Regreso a PR ${destino.pr} compatible con las migraciones actuales.`
    : `PR ${destino.pr} no funciona con las migraciones actuales: la migración nueva no es compatible hacia atrás.`);
} catch (error) {
  console.error(error.message);
} finally {
  await rm(copia, { recursive: true, force: true });
  await rmdir(path.dirname(copia)).catch(() => {});
}
process.exit(estado);
