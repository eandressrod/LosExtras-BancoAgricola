import { requireSession, getJSON } from './comun.js';

async function loadDetail() {
  const id = new URLSearchParams(location.search).get('id');
  const status = document.querySelector('#detail-status');
  const retry = document.querySelector('#retry');
  retry.hidden = true;
  status.className = 'note';
  if (!id) { status.textContent = 'Selecciona una promoción desde el listado.'; return; }
  status.textContent = 'Cargando detalle…';
  try {
    const promotion = await getJSON('/api/promocion?id=' + encodeURIComponent(id));
    document.querySelector('h1').textContent = promotion.merchant;
    for (const field of ['benefit', 'description', 'payment', 'restrictions']) {
      document.querySelector('#' + field).textContent = promotion[field];
    }
    document.querySelector('#detail').hidden = false;
    status.textContent = '';
  } catch (error) {
    status.textContent = error.message;
    status.className = 'error';
    retry.hidden = false;
  }
}

if (await requireSession()) {
  document.querySelector('#retry').addEventListener('click', loadDetail);
  document.querySelector('#use-promotion').addEventListener('click', () => {
    const instructions = document.querySelector('#instructions');
    instructions.hidden = false;
    instructions.querySelector('h2').focus();
  });
  loadDetail();
}
