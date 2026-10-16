// Fotos de datos en el bucket privado «respaldos» de Supabase Storage.
// Uso:
//   npm run respaldo -- crear
//   npm run respaldo -- listar
//   npm run respaldo -- restaurar <ruta-en-bucket> [--confirmar]   (sin --confirmar solo simula)
// No imprime filas: los registros de GitHub Actions son públicos.
import { execSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { obtenerClienteSupabase } from '../backend/config/supabase.js';
import { crearAccesoSupabase, crearFoto, restaurarFoto } from './respaldo-datos.js';
import { versionDeMigracion } from './versiones.js';

const BUCKET = 'respaldos';
const [accion, ruta] = process.argv.slice(2);

async function migracionLocal() {
  const archivos = (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter(nombre => nombre.endsWith('.sql')).sort();
  return versionDeMigracion(archivos.at(-1));
}

function commitActual() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try { return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { return 'desconocido'; }
}

async function asegurarBucket(cliente) {
  const { data, error } = await cliente.storage.getBucket(BUCKET);
  if (data) {
    if (data.public) throw new Error(`El bucket ${BUCKET} es público; debe ser privado.`);
    return;
  }
  if (error && !/not found/i.test(error.message)) throw new Error(`No se pudo consultar el bucket: ${error.message}`);
  const creado = await cliente.storage.createBucket(BUCKET, { public: false });
  if (creado.error) throw new Error(`No se pudo crear el bucket: ${creado.error.message}`);
}

async function crear(cliente) {
  await asegurarBucket(cliente);
  const migracion = await migracionLocal();
  const commit = commitActual();
  const foto = await crearFoto({ acceso: crearAccesoSupabase(cliente), migracion, commit });
  const destino = `${migracion}/${foto.fecha.replace(/[:.]/g, '-')}-${commit.slice(0, 7)}.json`;
  const { error } = await cliente.storage.from(BUCKET)
    .upload(destino, JSON.stringify(foto), { contentType: 'application/json', upsert: false });
  if (error) throw new Error(`No se pudo subir la foto: ${error.message}`);
  const filas = Object.values(foto.tablas).reduce((total, tabla) => total + tabla.length, 0);
  console.log(`Foto guardada en ${BUCKET}/${destino} (${filas} filas, migración ${migracion}).`);
}

async function listar(cliente) {
  const { data: carpetas, error } = await cliente.storage.from(BUCKET).list('', { sortBy: { column: 'name', order: 'desc' } });
  if (error) throw new Error(`No se pudo listar ${BUCKET}: ${error.message}`);
  for (const carpeta of carpetas) {
    const { data: fotos } = await cliente.storage.from(BUCKET).list(carpeta.name, { sortBy: { column: 'name', order: 'desc' } });
    for (const foto of fotos ?? []) console.log(`${carpeta.name}/${foto.name}`);
  }
}

async function restaurar(cliente) {
  if (!ruta) throw new Error('Indica la ruta de la foto: npm run respaldo -- restaurar <ruta> [--confirmar]');
  const { data, error } = await cliente.storage.from(BUCKET).download(ruta);
  if (error) throw new Error(`No se pudo descargar ${ruta}: ${error.message}`);
  const foto = JSON.parse(await data.text());
  const simular = !process.argv.includes('--confirmar');
  const resumen = await restaurarFoto(foto, { acceso: crearAccesoSupabase(cliente), migracionActual: await migracionLocal(), simular });
  resumen.tablas.forEach(({ tabla, filas }) => console.log(`${tabla}: ${filas} filas`));
  console.log(simular
    ? 'Simulación: no se escribió nada. Repetir con --confirmar para restaurar.'
    : 'Restauración aplicada. Las filas creadas después de la foto se conservan.');
}

const acciones = { crear, listar, restaurar };
if (!acciones[accion]) {
  console.error('Uso: npm run respaldo -- crear | listar | restaurar <ruta> [--confirmar]');
  process.exit(1);
}
try {
  await acciones[accion](obtenerClienteSupabase());
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
