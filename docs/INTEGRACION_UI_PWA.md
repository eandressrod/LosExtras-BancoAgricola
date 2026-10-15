# Integración de menú, UI y PWA con promociones

Fecha: 15 de octubre de 2026. Registro técnico del incremento y de las decisiones de integración para el equipo. Proyecto académico Los Extras; los productos, saldos y beneficios son datos ficticios.

## Versiones reunidas

El commit local `9271cad` de `feat/h19-menu` reúne H19 (menú y productos), login de prueba, recursos visuales, cargas/transiciones y H13 (PWA e inactividad). Se integra con `main` en `d8b2de9`, que ya contiene la guía compartida (PR #9), H5 (filtro por categoría, PR #10) y H16 (tarjetas propias, PR #11), además de Midi y las funcionalidades anteriores. No se sustituyen los cambios de los compañeros por la versión local.

Las dos historias incorporadas desde `main` son **H5 y H16**, identificadas por sus PR y ramas.

## Resultado funcional

- **H19:** menú con cuentas y tarjetas del propietario, productos de tarjeta, saldos, puntos, mensajes y metas. Mensajes leídos y operaciones de metas se persisten por usuario; el backend valida al propietario. Los tres perfiles multitarjeta de H19 conviven con A/B/demo. Las cuentas usan números completos de diez dígitos; las tarjetas se muestran enmascaradas.
- **Login:** bienvenida inicial, formulario y selector de todos los usuarios de prueba. Elegir un perfil rellena sus credenciales ficticias, sin enviar el formulario automáticamente. El punto azul indica que ese usuario aún no abrió Promociones, independientemente de si completó la encuesta. Contacto/Ayuda muestran información del equipo. Se mantiene el backend de sesión y Supabase; no se incorpora autenticación bancaria.
- **H5 y H16:** categorías vigentes del catálogo y elección temporal de una tarjeta propia para calcular sus beneficios. A conserva Básica/Black; B y demo usan su única tarjeta. La categoría se conserva al volver del detalle, la tarjeta se separa por perfil/pestaña y se limpia al iniciar/cerrar sesión. No se sobrescriben preferencias al usar estos controles.
- **Entrada a Promociones:** conserva la consulta de preferencias al venir del menú y la encuesta cuando corresponde. El registro de primera apertura se realiza una vez por carga, sin repetirlo al reintentar una consulta fallida.

## UI incorporada

La [guía de UI](GUIA_UI_BANCOAGRICOLA.md) sigue siendo la fuente de dirección visual y procedencia. Se incorporan CIB Sans Light/Bold locales, marca y trazos de bienvenida, huella/chevron del acceso de prueba, iconos y composición del menú. No se afirma igualdad visual total con la aplicación oficial. Los recursos compartidos de `docs/ui/` son referencias de desarrollo; solo los necesarios para las pantallas se sirven desde `public/recursos/`.

La primera visita de la pestaña mantiene la bienvenida al menos dos segundos y espera perfiles; después desvanece la bienvenida, muestra la cabecera del login con aro y revela el formulario. Las recargas no repiten la consulta inicial de perfiles; una sesión vigente vuelve al menú. La transición al menú se consume antes de esperar sus datos, evitando dejar el contenedor desplazado con una respuesta lenta. Se respeta movimiento reducido. Promociones conserva el aro mientras consulta sin perder los filtros ni la tarjeta elegida; una respuesta antigua no oculta la carga de la selección más reciente.

## PWA e inactividad

`public/pwa/` contiene manifest, iconos SV (Apple, Android y maskable), registro, service worker, recuperación de conexión y controlador de inactividad. Las seis pantallas enlazan estos recursos. El manifest solicita `standalone`, inicio `/index.html` y alcance `/`; Vercel y el servidor local permiten ese alcance mediante `Service-Worker-Allowed: /`. La instalación requiere un navegador compatible y HTTPS en la versión publicada. Los pasos de Android/Chrome e iPhone/Safari están en la [guía de desarrollo](GUIA_DESARROLLO.md#h13--instalación-en-androidios-y-sesión-por-inactividad).

Solo se guarda en Cache Storage la página autónoma de recuperación de conexión. Las páginas funcionales, API y datos privados usan red; instalar la PWA no habilita operaciones sin internet ni notificaciones push. Reintentar vuelve a la dirección original.

La sesión vence tras **120 segundos** sin actividad aceptada por el backend y avisa durante los últimos **20 segundos**; conserva un máximo absoluto de dos horas. `POST /api/auth/actividad` renueva únicamente una sesión válida y del mismo origen. Leer sesión o volver de segundo plano no renueva; se verifica antes de volver a revelar datos. El reloj y la operación atómica se resuelven en PostgreSQL. Cookies anteriores al nuevo formato requieren iniciar sesión de nuevo. La elección de tarjeta de H16 convive con este control y se limpia en el cierre normal o al detectar sesión inválida.

## Resolución de conflictos

Se completó el merge de `origin/main` ya iniciado sobre `feat/h19-menu`. Los cinco archivos pendientes se resolvieron conservando ambas capacidades:

| Archivo | Decisión |
| --- | --- |
| `public/js/comun.js` | Mantener control de inactividad H13 y almacenamiento/limpieza de tarjeta H16. |
| `public/js/promociones.js` | Combinar apertura/encuesta, aro, categorías y tarjetas; mantener protección contra respuestas fuera de orden. |
| `public/promociones.html` | Conservar controles H5/H16 junto a recursos PWA y aro. Retirar el comentario heredado que decía que la PWA estaba pendiente. |
| `scripts/dev.js` | Servir juntas las rutas de tarjetas, mensajes, metas, apertura y actividad, además de las anteriores. |
| `tests/integration/base-datos.test.js` | Conservar tablas H19/H13 y adiciones H16; contar A/B/demo sin confundirlos con los perfiles adicionales de H19. |

Las pruebas de carga y su navegador de prueba se adaptan al flujo conjunto. Dos expectativas de H16 conservaban `•••• 0341` para B: se actualizan a `•••• 1744`, resultado de la migración H19 de numeración que coincide con el mock. No se cambian números ni saldos para hacer pasar esas pruebas. Las migraciones se conservan aditivas y en su orden; no se reescribe el historial SQL ni se aplica una nueva migración por este merge.

El recorrido real detectó además una incompatibilidad de presentación: H16 almacena tarjetas como filas de `cuentas`, algunas sin `numero_completo`; el menú H19 esperaba ese campo y mostraba «null Tarjeta de Crédito». `referenciaCuenta` ahora usa la referencia enmascarada para las tarjetas, incluso cuando existe número completo, y conserva el número completo en cuentas de ahorro/corriente. Esas filas de tarjeta no muestran el botón Compartir número. Se mantienen los contratos de datos existentes y el catálogo de productos de H19; no se fusionan ni migran sus modelos por este ajuste. Una prueba unitaria y una de integración se escribieron y observaron fallar antes de corregir; después pasó la suite completa.

La renovación por inactividad reveló otro problema en el adaptador local: reconstruía las peticiones con origen fijo `http://localhost`, perdiendo el host y puerto del navegador; una renovación legítima recibía 403. El adaptador ahora conserva `Host` al crear la URL. Una prueba HTTP con servidor real en puerto efímero reprodujo primero el 403 y comprueba después renovación del mismo origen con 200 y rechazo de origen ajeno con 403. No se relaja la validación de origen del endpoint ni se cambia configuración remota.

## Verificación y límites

Verificado antes de publicar, con Node 24.15.0:

- `npm ci`: instalación reproducible, cero vulnerabilidades informadas.
- `npm test`: **284/284** pruebas locales, cero fallos y cero omitidas. Primera ejecución integrada: 279/281; las dos diferencias de numeración descritas arriba quedaron corregidas. Se añadieron después las dos regresiones de presentación de tarjetas y la prueba HTTP del origen local, observadas primero en rojo y después en verde.
- Suite remota con `.env` privado y concurrencia 2: **10/10** contra Supabase, incluidas H5, H16, H19, login/Midi e inactividad. Las pruebas que escriben crean datos de QA o sesiones propias y ejecutan su limpieza; no se modifica esquema remoto.

Estas comprobaciones no acreditan TDD retroactivo, instalación física en iPhone/Android, aceptación final del PO ni verificación de todos los criterios por persona externa. La integración y el CI no bastan para declarar Done las historias o cerrar el sprint. Las comprobaciones de CI y publicación posteriores quedan asociadas al PR y al commit de merge en GitHub.
