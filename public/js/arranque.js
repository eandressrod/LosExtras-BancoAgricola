// Se ejecuta antes de pintar una página privada. La navegación interna conserva su carga de módulo.
(() => {
  const direccion = volver => { if (volver) document.documentElement.dataset.direccion = 'volver'; };
  try { direccion(sessionStorage.getItem('los-extras-direccion') === 'volver');sessionStorage.removeItem('los-extras-direccion'); } catch {}
  if (typeof addEventListener === 'function') {
    addEventListener('unhandledrejection', event => {
      // El navegador puede cancelar la captura al redirigir antes de mostrar una página intermedia.
      if (['AbortError','InvalidStateError'].includes(event.reason?.name)
        && event.reason.message === 'Transition was aborted because of invalid state. ViewTransition opt-in disabled') event.preventDefault();
    });
    addEventListener('pagereveal', event => {
      if (!event.viewTransition) return;
      event.viewTransition.ready.catch(() => {});
      event.viewTransition.finished.catch(() => {});
      event.viewTransition.finished.then(() => { delete document.documentElement.dataset.direccion; }, () => {});
      event.viewTransition.updateCallbackDone.catch(() => {});
      if (['/','/index.html'].includes(location.pathname) || ['login','carga','fade'].includes(document.documentElement.dataset.entradaMenu)) {
        event.viewTransition.skipTransition();
        return;
      }
      document.documentElement.dataset.transicionNativa = '1';
      document.documentElement.removeAttribute('data-entrada-menu');
      const activacion = globalThis.navigation?.activation;
      direccion(activacion?.navigationType === 'traverse' && activacion.from?.index > activacion.entry?.index);
    });
    addEventListener('pageswap', event => {
      const activacion = event.activation;
      direccion(activacion?.navigationType === 'traverse' && activacion.from?.index > activacion.entry?.index);
      event.viewTransition?.ready.catch(() => {});
      event.viewTransition?.finished.catch(() => {});
      event.viewTransition?.updateCallbackDone.catch(() => {});
      if (document.body?.dataset.session === 'pending') event.viewTransition?.skipTransition();
      try { if (['login','carga','fade'].includes(sessionStorage.getItem('los-extras-entrada-menu')) || ['/','/index.html'].includes(new URL(activacion?.entry?.url).pathname)) event.viewTransition?.skipTransition(); } catch {}
    });
    document.addEventListener?.('click', event => {
      const enlace = event.target.closest?.('a[href]');
      if (!enlace) return;
      const url = new URL(enlace.href,location.href);
      if (url.origin !== location.origin) return;
      const actual = location.pathname;
      const volver = url.pathname === '/menu.html' || (['/detalle.html','/preferencias.html'].includes(actual) && url.pathname === '/promociones.html');
      document.documentElement.dataset.direccion = volver ? 'volver' : 'entrar';
      try { sessionStorage.setItem('los-extras-direccion',volver ? 'volver' : 'entrar'); } catch {}
    },true);
  }
  if (location.pathname === '/' || location.pathname === '/index.html') return;
  const entrada = performance.getEntriesByType('navigation')[0];
  let interna = false;
  try { interna = new URL(document.referrer).origin === location.origin; } catch { /* Apertura directa. */ }
  if (!interna || entrada?.type === 'reload' || entrada?.type === 'back_forward') {
    document.documentElement.dataset.arranque = 'pending';
    document.documentElement.setAttribute('aria-busy', 'true');
  }
})();
