import { getSession, setSession } from './comun.js';

// Acceso público del esqueleto; H1 incorporará los perfiles básica/Black.
if (getSession() === 'demo') location.replace('/menu.html');
document.querySelector('#login-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const error = document.querySelector('#login-error');
  if (data.get('username').trim() !== 'demo' || data.get('password') !== 'demo123') {
    error.textContent = 'Usuario o contraseña incorrectos.';
    return;
  }
  if (!setSession('demo')) {
    error.textContent = 'El navegador no permite guardar la sesión. Habilita el almacenamiento para continuar.';
    return;
  }
  location.assign('/menu.html');
});
