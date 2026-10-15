// Recursos de instalación compartidos por Android/iOS. Nunca registra permisos push.
if ('serviceWorker' in navigator && window.isSecureContext) {
  navigator.serviceWorker.register('/pwa/sw.js', { scope: '/', updateViaCache: 'none' })
    .catch(() => { /* La navegación normal sigue disponible si no se puede preparar la recuperación. */ });
}
