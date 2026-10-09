import { requireSession, loadPreferences, logout, cardName, cardShortName } from './comun.js';

function showProfile(profile) {
  const art = document.querySelector('#profile-card-art');
  art.classList.add('card-art--' + profile.tipoTarjeta);
  art.querySelector('.card-art__name').textContent = cardShortName(profile);
  document.querySelector('#profile-name').textContent = profile.nombre;
  document.querySelector('#profile-card').textContent = `Perfil ${profile.id} · ${cardName(profile)}`;
}

const profile = await requireSession();
if (profile) {
  showProfile(profile);
  document.querySelector('#open-promotions').addEventListener('click', () => {
    location.assign(loadPreferences(profile.id).completed ? '/promociones.html' : '/encuesta.html');
  });
  const logoutButton = document.querySelector('#logout');
  logoutButton.addEventListener('click', async () => {
    const error = document.querySelector('#logout-error');
    error.textContent = '';
    logoutButton.disabled = true;
    try {
      await logout();
      location.replace('/index.html');
    } catch (problem) {
      error.textContent = problem.message;
      logoutButton.disabled = false;
    }
  });
}
