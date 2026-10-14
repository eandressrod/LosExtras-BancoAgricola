export function configurarArrastre(zona, recibir) {
  zona.addEventListener('dragover', e => { e.preventDefault(); zona.classList.add('arrastrando'); });
  zona.addEventListener('dragleave', () => zona.classList.remove('arrastrando'));
  zona.addEventListener('drop', e => { e.preventDefault(); zona.classList.remove('arrastrando'); recibir(e.dataTransfer.files[0]); });
}

export async function prepararImagen(file) {
  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[file.type];
  if (!ext || !file.size || file.size > 2097152) throw new Error('Elige una imagen PNG, JPG o WebP de hasta 2 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2,'0')).join('');
  let binario = ''; for (let i = 0; i < bytes.length; i += 16384) binario += String.fromCharCode(...bytes.subarray(i,i+16384));
  return { ruta: `/recursos/midi/${hash}.${ext}`, contenido: btoa(binario), vista: URL.createObjectURL(file) };
}
