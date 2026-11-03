// SCRUM-130: el servidor local lee las rutas de los mismos lugares que Vercel.
// Cada archivo de api/ es una función en /api/<ruta> y cada rewrite de vercel.json apunta a una de ellas.
import { readdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';

const DIRECTORIO_API = fileURLToPath(new URL('../api/', import.meta.url));

/** Importa cada archivo de api/ como `/api/<ruta sin .js>` → su handler por defecto. */
export async function cargarFunciones(directorio = DIRECTORIO_API) {
  const archivos = (await readdir(directorio, { recursive: true })).filter(archivo => archivo.endsWith('.js')).sort();
  const funciones = {};
  for (const archivo of archivos) {
    funciones['/api/' + archivo.replaceAll('\\', '/').slice(0, -3)] = (await import(pathToFileURL(join(directorio, archivo)).href)).default;
  }
  return funciones;
}

/** Funciones más las rutas reescritas, que usan el handler de su destino. */
export function rutasDesdeVercel(config, funciones) {
  const rutas = { ...funciones };
  for (const { source, destination } of config.rewrites ?? []) {
    const destino = new URL(destination, 'http://local').pathname;
    if (!Object.hasOwn(funciones, destino)) throw new Error(`La rewrite de ${source} apunta a ${destino}, que no existe en api/.`);
    rutas[source] = funciones[destino];
  }
  return rutas;
}

/** Cabeceras que vercel.json fija para un archivo estático. */
export function cabecerasEstaticas(config, pathname) {
  const reglas = (config.headers ?? []).filter(({ source }) => source === pathname);
  return Object.fromEntries(reglas.flatMap(({ headers }) => headers.map(({ key, value }) => [key, value])));
}
