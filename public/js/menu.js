import { requireSession, loadPreferences, setSession } from './comun.js';

if (requireSession()) {
  document.querySelector('#open-promotions').addEventListener('click', () => {
    location.assign(loadPreferences().completed ? '/promociones.html' : '/encuesta.html');
  });
  document.querySelector('#logout').addEventListener('click', () => {
    setSession(null);
    location.replace('/index.html');
  });
}
