import { getJSON } from './comun.js';

export async function cargarCategorias(contenedor) {
  const categorias = await getJSON('/api/categorias');
  const opciones = categorias.map(c => {
    const label = document.createElement('label'); label.className = 'option'; label.dataset.categoria = c.id;
    const input = document.createElement('input'); input.type = 'checkbox'; input.name = 'category'; input.value = c.id;
    label.append(input);
    if (c.imagen_url) { const img = document.createElement('img'); img.src = c.imagen_url; img.alt = ''; img.width = 40; img.height = 40; label.append(img); }
    label.append(document.createTextNode(c.nombre)); return label;
  });
  contenedor.replaceChildren(...opciones);
  return [...contenedor.querySelectorAll('input')];
}
