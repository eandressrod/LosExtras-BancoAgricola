// Valida catalogo/catalogo.json y escribe una migración nueva con su carga para Supabase.
// Uso: npm run catalogo:generar -- <nombre>   (por ejemplo, h24_catalogo_lote_1)
// El mock lee la misma fuente al iniciar; la migración no se aplica sola a ninguna base.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarCatalogo } from './validar.js';
import { generarSqlCatalogo } from './sql.js';

const raiz = fileURLToPath(new URL('../..', import.meta.url));
const nombre = process.argv[2] ?? '';
if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(nombre)) {
  console.error('Indica el nombre de la migración: npm run catalogo:generar -- h24_catalogo_lote_1');
  process.exit(1);
}

const catalogo = JSON.parse(await readFile(path.join(raiz, 'catalogo', 'catalogo.json'), 'utf8'));
const { errores, avisos } = validarCatalogo(catalogo, { existeArchivo: ruta => existsSync(path.join(raiz, 'public', ruta)) });
for (const aviso of avisos) console.warn(`Aviso ${aviso.regla} · ${aviso.entidad} ${aviso.id}: ${aviso.mensaje}`);
if (errores.length) {
  for (const error of errores) console.error(`Error ${error.regla} · ${error.entidad} ${error.id ?? ''}: ${error.mensaje}`);
  process.exit(1);
}

const marca = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const archivo = `${marca}_${nombre}.sql`;
await writeFile(path.join(raiz, 'supabase', 'migrations', archivo), generarSqlCatalogo(catalogo));
console.log(`Migración creada: supabase/migrations/${archivo}`);
