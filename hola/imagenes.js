import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const destino = fileURLToPath(new URL('../public/recursos/midi/', import.meta.url));
const campos = { categorias: 'imagen_url', comercios: 'logo_url', promociones: 'imagen_url' };
const fallo = mensaje => Object.assign(new Error(mensaje), { estado: 400 });
export function crearAlmacenImagenes(directorio = destino) {
  return {
    async guardar(cambios, archivos = []) {
      if (!Array.isArray(archivos) || archivos.length > 10) throw fallo('Admite hasta 10 imágenes por guardado.');
      const referencias = new Set(cambios.filter(c => c.operacion !== 'eliminar' && campos[c.tabla]).map(c => c.datos?.[campos[c.tabla]]));
      let total = 0;
      const preparados = archivos.map(a => {
        if (!a || typeof a.contenido !== 'string' || a.contenido.length > 2800000 || typeof a.ruta !== 'string') throw fallo('Imagen no válida; máximo 2 MB.');
        const coincidencia = /^\/recursos\/midi\/([a-f0-9]{64})\.(png|jpg|webp)$/.exec(a.ruta);
        if (!coincidencia || !referencias.has(a.ruta)) throw fallo('Ruta de imagen sin referencia válida.');
        const bytes = Buffer.from(a.contenido, 'base64'); total += bytes.length;
        if (!bytes.length || bytes.length > 2097152 || total > 8388608 || bytes.toString('base64') !== a.contenido) throw fallo('Imagen no válida; máximo 2 MB por archivo y 8 MB por lote.');
        const png = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
        const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
        const webp = bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP';
        if (!({ png, jpg, webp })[coincidencia[2]] || createHash('sha256').update(bytes).digest('hex') !== coincidencia[1]) throw fallo('El contenido de la imagen no corresponde a su ruta o formato.');
        return { nombre: a.ruta.split('/').at(-1), bytes };
      });
      if (!preparados.length) return;
      await mkdir(directorio, { recursive: true });
      for (const p of preparados) {
        try { await writeFile(join(directorio, p.nombre), p.bytes, { flag: 'wx' }); }
        catch (e) { if (e.code !== 'EEXIST') throw e; if (!(await readFile(join(directorio,p.nombre))).equals(p.bytes)) throw fallo('El archivo de imagen existente no coincide.'); }
      }
    }
  };
}
