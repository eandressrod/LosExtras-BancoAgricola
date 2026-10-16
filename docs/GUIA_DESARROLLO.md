# Guía de desarrollo — Los Extras

## Regeneración de cuentas y tarjetas — 15 de octubre de 2026

Adaptación local autorizada: `cuentas` contiene solo cuentas bancarias, con números completos de 10 dígitos. `tarjetas_usuario` es la única fuente de tarjetas del menú y Promociones; cada tarjeta requiere `cuenta_id` y `perfil_id` coincidentes con una cuenta, `tipo_tarjeta` para beneficios y `numero_enmascarado` con solo los últimos cuatro dígitos. La cuenta asociada se muestra completa en Mis Tarjetas. Sin tarjetas reales asociadas se devuelve una lista vacía, sin fabricar una tarjeta a partir del perfil. Los identificadores de selección de A/B/demo se conservan.

La migración `20261016015547_regenerar_cuentas_tarjetas.sql` está **aplicada al proyecto compartido** por autorización explícita del 15 de octubre de 2026; el nombre local está alineado con la versión registrada en Supabase. Es una regeneración explícitamente destructiva de cuentas/tarjetas de prueba, no un seed para repetir: no modifica perfiles, credenciales, preferencias, catálogo, puntos, mensajes, metas ni sesiones. El backend adaptado ya está publicado directamente en Vercel, sin commit/push. La versión de main anterior a esta adaptación obtiene tarjetas de `cuentas`: integrar estos cambios antes de otro despliegue automático. No volver a publicar ese backend anterior. El frontend actualizado permanece local; esta publicación conserva las pantallas anteriores. No ejecutar automáticamente sobre una base compartida ni reaplicar migraciones históricas después de esta regeneración.

Los datos mock reflejan la misma estructura y contienen once cuentas y trece tarjetas para los seis perfiles locales. La migración también contempla perfiles adicionales existentes en la base. El campo legado `cuentas.numero_enmascarado` se sincroniza con el número completo para compatibilidad, sin ocultarlo; usar `numero_completo` para cuentas. Midi genera y edita ese número completo y deja de crear filas de tarjeta dentro de cuentas. Las tarjetas siguen restringidas por propietario en las API y por FK compuesta en la base; no se exponen números completos de tarjeta.

El [registro de integración de UI, menú y PWA](INTEGRACION_UI_PWA.md) explica el incremento del 15 de octubre de 2026, su convivencia con H5/H16, los conflictos resueltos y las verificaciones realizadas.

El despliegue conserva 12 entradas de función para Vercel Hobby: mensajes, metas y apertura de Promociones comparten `api/recursos.js` mediante rewrites; sus handlers están en `backend/handlers/`. Las URL de la aplicación y las validaciones de sesión no cambian. El servidor local utiliza la misma entrada compartida.

## H13 · Instalación en Android/iOS y sesión por inactividad

Incorporación del 14 de octubre de 2026. Los archivos de la PWA viven en `public/pwa/`: manifest, iconos, estilos, registro, service worker, recuperación de conexión y controlador de inactividad. Los HTML enlazan esos recursos; la sesión conserva su implementación en el backend existente. No requiere dependencias npm nuevas.

Para probar la versión publicada, abrir su URL HTTPS en **Chrome de Android**, usar el menú de Chrome → **Instalar aplicación** o **Añadir a pantalla de inicio** según la versión y confirmar. En **Safari de iPhone**, abrir la URL → Compartir → **Añadir a pantalla de inicio** → mantener **Abrir como app web** si aparece → Añadir. Después abrir el icono Bancoagrícola. Registrar modelo, versión del sistema y navegador realmente probados; estas instrucciones no acreditan instalación física. La aceptación inicial acordada es iPhone/Safari y se preparan recursos estándar también para Android.

El manifest identifica `/`, inicia en `/index.html`, cubre `/` y solicita modo `standalone`. La aplicación usa la navegación y áreas seguras de sus pantallas actuales; no dibuja barras del sistema ni solicita notificaciones. Los PNG 180/192/512 proceden de la imagen con símbolo, curvas y «SV» aportada y elegida por el usuario el 14 de octubre de 2026, conservada en `public/pwa/icono-original.png`; el de 512 es una copia idéntica. La variante maskable contiene la composición a 410×410 centrada en un lienzo blanco de 512 para proteger el contenido del recorte de Android. Se sustituyó el símbolo trazado anterior y se retiró `icono.svg`. Los enlaces de iconos usan `?v=sv-1` para distinguir esta versión en la caché; la actualización de un icono ya instalado depende del sistema operativo.

La instalación no permite operar sin internet. Después de preparar correctamente el service worker con conexión, un fallo de red al navegar muestra una página autónoma con Reintentar; recarga la dirección original. Solo esa página se guarda en Cache Storage, nunca API, cookies, datos de perfil ni páginas funcionales. `vercel.json` y el servidor local envían `Service-Worker-Allowed: /` para `/pwa/sw.js`, manteniendo el worker dentro de `pwa/`. Los cambios del worker se comprueban sin reutilizar la caché HTTP de su script; una versión nueva sustituye a la anterior por el ciclo normal del navegador.

La sesión vence a los **120 segundos** desde la última actividad aceptada por el backend y avisa durante los últimos **20**. Toques, teclado, escritura, rueda y desplazamiento táctil cuentan como interacción; peticiones automáticas, restauración de scroll y volver del segundo plano no renuevan. En el aviso, Continuar renueva y Cerrar sesión revoca. Cambiar de aplicación o bloquear el teléfono mantiene el tiempo corriendo; al regresar se comprueba sesión antes de revelar datos. Si falla la renovación, no se amplía el plazo conocido. El límite absoluto de dos horas permanece vigente aunque haya actividad.

Corrección del 15 de octubre: Promociones, detalle y lectura de mensajes muestran un aviso discreto con contador; una interacción real solicita renovar y lo retira tras confirmación. Las demás zonas conservan el diálogo con Continuar/Cerrar sesión. Apertura, recarga y retorno del segundo plano muestran la bienvenida bancaria mientras se comprueba sesión; no repetirla al navegar internamente ni consultar perfiles en cada recarga. La cubierta de retorno es un diálogo a pantalla completa para permitir Reintentar incluso si ya estaba abierto Mensajes u otro diálogo. El login conserva bienvenida y comprobación también al volver del segundo plano. La expiración detectada por una API privada conserva el motivo para avisar en el login; la primera visita sin sesión no se presenta como una sesión expirada. No cambia el contrato de las API ni requiere migraciones.

`POST /api/auth/actividad` exige cookie válida y mismo origen. Login, sesión y actividad devuelven `{perfil, sesion:{id, ahora, inactivaEn, expiraEn}}`, con fechas en milisegundos; `GET /api/auth/sesion` no renueva y, sin sesión válida (ausente, alterada, revocada o vencida), responde 200 con `{perfil:null, sesion:null}` para que la primera visita al login no registre un 4xx en consola; las demás API privadas mantienen 401. La validación compartida de todas las API privadas consulta `sesiones_actividad` mediante `estado_actividad_sesion`, con reloj/bloqueo de PostgreSQL, RLS y permisos exclusivos del backend. Las sesiones vencidas o revocadas no reviven, ni con copia de la cookie. La firma incorpora la fecha de creación; cookies anteriores requieren iniciar sesión nuevamente. La marca local del login ya no determina si se consulta la sesión.

Antes de ejecutar/desplegar este código en otra base, aplicar en orden las migraciones `20261015013734_h13_sesion_inactividad.sql` y `20261015014018_h13_actividad_eliminar_perfil.sql`. La segunda permite que Midi retire un perfil con su estado efímero de actividad. Ambas están aplicadas en el proyecto compartido. No volver a ejecutar migraciones anteriores. No se usa Supabase Auth ni se exponen claves privadas al navegador.

Verificación: `npm test`; `npm run test:remote` incluye la prueba H13 de renovación, vencimiento y revocación con sesiones propias de prueba. Sus registros quedan revocados al finalizar; no modifica categorías, cuentas ni catálogo. La instalación real y la DoD completa requieren su evidencia independiente.

Actualizada el 13 de octubre de 2026. Los comandos se ejecutan desde la carpeta del repositorio, donde está `package.json`.

Esta es la guía principal del equipo: explica instalación, ejecución, datos y verificación. Las [reglas para agentes](../AGENTS.md) indican cómo colaborar y respetar el alcance; la [guía de UI de Bancoagrícola](GUIA_UI_BANCOAGRICOLA.md) define la dirección visual para login, menú y Promociones.

Para trabajar en una pantalla, leer primero la guía de UI y los criterios de su historia. El [kit visual compartido](GUIA_UI_BANCOAGRICOLA.md#procedencia-y-recursos-compartidos), en `docs/ui/kit-bancoagricola-v1/`, contiene SVG, previews, tokens y procedencia para comparar diseños y reutilizar piezas. Son reconstrucciones y propuestas, no recursos oficiales certificados. Los tokens son referencia, no estilos aplicados automáticamente. Esta carpeta no se sirve como parte de `public/`: copiar allí solo los assets que una implementación autorizada necesite. La guía visual no añade funciones ni sustituye la DoD.

## 1. Requisitos y acceso


- Instalar [Git](https://git-scm.com/downloads) y [Node.js 24](https://nodejs.org/en/download), que incluye npm.
- Para subir una rama, usar una cuenta GitHub con la invitación al repositorio aceptada.
- Para administrar datos en el panel de Supabase, crear una cuenta propia y solicitar invitación a **Los-ExtrasBA** con el correo de esa cuenta. El rol **Developer** permite trabajar con tablas, filas y SQL. No compartir la cuenta del propietario. [Permisos de Supabase](https://supabase.com/docs/guides/platform/access-control).
- Para trabajar localmente no hace falta acceso a Vercel ni instalar Docker.

Comprobar las herramientas:

```powershell
git --version
node --version
npm --version
```

Node debe mostrar `v24.x`.

## 2. Clonar e instalar

Abrir una terminal en la carpeta donde se quiera guardar el proyecto:

```powershell
git clone https://github.com/eandressrod/LosExtras-BancoAgricola.git
cd LosExtras-BancoAgricola
npm ci
```

Para una copia ya existente, guardar los cambios propios antes de actualizar. Con el árbol limpio:

```powershell
git switch main
git pull --ff-only origin main
npm ci
```

Crear una rama para el trabajo; sustituir el nombre por la historia o tarea correspondiente:

```powershell
git switch -c trabajo/SCRUM-2-login
```

## 3. Configurar Supabase

| Dato | Valor |
| --- | --- |
| Proyecto | LosExtras-BancoAgricola |
| Referencia | `tiozihgkdyvoycatxwvo` |
| Dashboard | https://supabase.com/dashboard/project/tiozihgkdyvoycatxwvo |
| URL de la API | `https://tiozihgkdyvoycatxwvo.supabase.co` |

Copiar `.env.example` a `.env` **solo si todavía no existe**. En PowerShell:

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
```

Abrir `.env` en el editor y completar:

```dotenv
DATA_SOURCE=supabase
SUPABASE_URL=https://tiozihgkdyvoycatxwvo.supabase.co
SUPABASE_SECRET_KEY=
```

La clave se obtiene mediante acceso autorizado a **Settings → API Keys → Secret keys**, o se solicita por un canal privado. Usar **Copy API key** para copiarla completa y pegarla después de `SUPABASE_SECRET_KEY=`. El texto visible con puntos está incompleto. Una clave `sb_publishable_...` no sustituye la clave privada del backend. [Tipos de claves](https://supabase.com/docs/guides/getting-started/api-keys).

`.env` está ignorado por Git. No subirlo ni pegar la clave en Jira, chats, capturas, HTML o JavaScript de `public/`. La aplicación se conecta mediante el SDK y nuestra API; no necesita la contraseña de PostgreSQL para este flujo.

Comprobar la conexión con consultas de solo lectura:

```powershell
npm run test:remote
```

Si todavía no se cuenta con la clave, se puede desarrollar con el catálogo local cambiando únicamente `DATA_SOURCE=mock` en `.env`. En ese modo, `test:remote` no corresponde: exige Supabase real.

`SESSION_SECRET` firma la cookie de sesión. En local es opcional: si falta, `npm run dev` usa una clave temporal y avisa en la terminal. Para fijarla, generar un valor y pegarlo después de `SESSION_SECRET=` en `.env`:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

Cada entorno usa su propio valor; no reutilizar el de Vercel ni compartirlo por chat.

## 4. Ejecutar el servidor local

```powershell
npm run dev
```

Abrir **http://127.0.0.1:3000**. Mantener la terminal abierta y detener el servidor con **Ctrl+C**. Reiniciarlo después de cambiar `.env` o archivos del backend.

El servidor sirve las páginas y ejecuta `/api/perfiles`, `/api/promociones` (`?categoria=Compras` aplica el filtro temporal de H5, `?tarjeta=` la tarjeta propia elegida en H16 y `?hoy=1` Disponibles hoy de H17: vigencia inclusiva y días permitidos según la fecha civil de El Salvador; cada oferta incluye `availableToday`), `/api/promocion?id=restaurante`, `/api/tarjetas` y `/api/auth/login`, `/api/auth/sesion`, `/api/auth/logout`. Live Server o abrir un HTML directamente no ejecuta estos endpoints.

Los usuarios de prueba de H1 están guardados en la tabla `perfiles` de Supabase. Además de esta guía, el login permite seleccionarlos y autocompletar su acceso ficticio, por petición expresa del usuario del 14 de octubre:

| Perfil | Tarjeta | Usuario | Clave |
| --- | --- | --- | --- |
| A | Básica y Black | `demo.basica` | `Basica2026` |
| B | Black | `demo.black` | `Black2026` |
| demo (general) | Básica | `demo` | `demo123` |

Las tarjetas propias (H16) son las cuentas de tipo tarjeta de cada perfil, con su segmento Básica o Black (migración `tarjetas_propias`). A tiene dos y en "Para ti" elige con cuál consultar beneficios; B y demo usan directamente su única tarjeta.

El formulario envía usuario y clave a `/api/auth/login`; el backend busca el usuario en la base y compara la clave con su hash. Con `DATA_SOURCE=supabase` (Vercel y `.env`) se usa la base; `mock` solo sirve para pruebas automáticas y desarrollo sin claves, con los mismos usuarios en `backend/datos.js`. No hay registro, recuperación, MFA ni autenticación bancaria. Al entrar, el backend envía una cookie `HttpOnly` firmada con máximo absoluto de 2 horas y vencimiento por inactividad a los 120 segundos (H13). Cada página privada consulta `/api/auth/sesion` para conocer el perfil (`id`, `nombre`, `tipoTarjeta`); el navegador no guarda la identidad. Si cambian los datos de prueba: `npm run hash -- "NuevaClave"`, una migración nueva, `backend/datos.js` y esta guía. La encuesta y Mis preferencias consultan y guardan categorías por usuario mediante `/api/preferencias` en Supabase; los filtros de H5 y la tarjeta elegida de H16 son temporales y no cambian esas preferencias.

La apertura muestra la bienvenida bancaria como reinicio, sin slide de entrada. Después hace fade a la cabecera/bienvenida con círculo mientras prepara datos y cambia al formulario sin fade. La primera bienvenida conserva 2 s; la consulta inicial de `/api/perfiles?testing=1` transcurre durante la fase del círculo, sin sumar otros 2 s. `los-extras-inicio-listo` se marca solo tras éxito y las siguientes aperturas no repiten esa consulta. Una sesión vigente recuperada desde el inicio entra al menú con fade. Tras Continuar, se conserva la misma cabecera/círculo; `deslizarHaciaMenu` entrega el marcador `login` consumido una vez por `animarEntradaMenu` para retirar esa pantalla hacia la derecha cuando el menú tiene datos. La transición nativa se omite para evitar duplicarla. Un acceso inválido recupera formulario, controles y foco. Las respuestas anteriores se descartan si la app vuelve al segundo plano. El formulario limpia los campos al preparar el acceso y el aviso de expiración se oculta sin moverlos. Tamaños y animaciones: [guía UI](GUIA_UI_BANCOAGRICOLA.md#aplicación-por-pantalla).

Al pasar a segundo plano, el navegador registra `{id, desde}` de la sesión en `bancoagricola-app-oculta` y mantiene también el instante en memoria. La app cierra tras 20 s fuera mediante `/api/auth/logout`; si el sistema pausa JavaScript, comprueba el tiempo transcurrido al volver antes de revelar datos. Una carga nueva con la misma cookie también comprueba la marca y revoca antes de recuperar el perfil visible. Si falla esa revocación, se mantiene el bloqueo/reintento. Antes de 20 s, verifica la sesión y hace fade a la misma vista, conservando URL, scroll, pestaña y diálogo. La marca solo puede adelantar el cierre: no concede acceso ni sustituye la validación de cookie del servidor. El backend conserva el límite de 120 s y la revocación existente; no hay RPC, migración o plazo de servidor nuevos. No se garantiza ejecución puntual de JavaScript si el sistema suspende la PWA; validar el ciclo real en el dispositivo de aceptación.

Las comprobaciones de sesión y cargas de módulos esperan al menos 1 s en paralelo con la petición mediante `conMinimoCarga`; una petición lenta no añade otro segundo al terminar. Volver de la Bandeja de entrada selecciona Cuentas y repite su indicador usando los datos ya disponibles, sin otro GET `/api/menu`. Un fallo mantiene Reintentar y la verificación de sesión; no entra en un bucle automático. El aro compartido está en `public/recursos/menu/carga.svg`; recursos y lógica de carga en `public/recursos/inicio/`, `public/css/inicio.css`, `public/css/carga.css`, `inicio.js` y `transiciones.js`. CIB Sans Light/Bold local conserva la procedencia y el permiso indicados en la guía UI.

El login usa `public/css/login.css` y los iconos de `public/recursos/login/`. «Ver usuarios de prueba» abre un diálogo que refresca todos los perfiles de la base, incluidos los creados y guardados desde Midi. Elegir uno rellena usuario y clave; Continuar valida mediante H1. Recuperar usuario o clave abre el mismo selector; Contacto y Ayuda muestran la información de Los Extras. Se omite Clave Dinámica. La respuesta pública de testing contiene únicamente `id`, `nombre`, `tipoTarjeta`, `usuarioAcceso`, `clavePrueba` y `promocionesAbiertas`, sin hash, con `Cache-Control: no-store`; el GET sin `testing=1` mantiene su contrato anterior. Son credenciales ficticias del proyecto expresamente autorizadas para autocompletar, nunca claves privadas de Supabase ni acceso bancario.

La migración `20261014212538_login_usuarios_prueba.sql`, aplicada el 14 de octubre, añade `perfiles.clave_prueba` y `promociones_abiertas`. Midi guarda la clave ficticia junto con el hash al crear/cambiar contraseña; edición sin contraseña conserva ambos y retirar usuario de acceso borra ambos. Perfiles externos sin clave de prueba siguen visibles y requieren escribirla manualmente. El punto azul indica flag false: al entrar a Promociones se envía POST `/api/promociones-apertura`, con propietario obtenido exclusivamente de la sesión. Se registra antes de decidir encuesta/listado, independientemente de guardar u omitir encuesta. No hay historial de visitas. La flag se inicializa false para los perfiles existentes porque no había estado histórico de apertura. Prueba remota del flujo: `node --env-file-if-exists=.env --test tests/remote/usuarios-prueba.test.js`; crea/edita un perfil temporal y elimina solo ese registro al finalizar.

## 5. Ubicar archivos y trabajar con TDD

Revisión de H1: cada cookie nueva incluye un identificador único de sesión. El backend consulta `sesiones_revocadas` antes de autorizar y guarda la revocación antes de borrar la cookie al cerrar sesión. Una copia de la cookie cerrada deja de funcionar, sin cerrar otras sesiones del mismo usuario. Si falla la base, el cierre responde 503 y el frontend debe mostrar el error; reutilizar `logout()` de `public/js/comun.js` y comprobar su éxito.

Antes de desplegar esta revisión con Supabase, aplicar la migración nueva `20261009232447_revocacion_sesiones.sql`; no volver a ejecutar las anteriores. La tabla tiene RLS y solo permite SELECT/INSERT al backend con clave privada. Las cookies del formato anterior requerirán iniciar sesión otra vez. Los registros de revocación conservan su vencimiento; se pueden retirar cuando la sesión ya haya expirado, sin reactivar cookies vigentes.

| Carpeta | Contenido |
| --- | --- |
| `public/` | HTML, JavaScript de pantallas, CSS y recursos |
| `api/` | Handlers HTTP |
| `backend/` | Lógica, configuración y repositorios mock/Supabase |
| `supabase/migrations/` | Cambios reproducibles del esquema y carga inicial |
| `tests/unit/` | Pruebas unitarias de lógica |
| `tests/integration/` | Pruebas de API y base PostgreSQL en memoria |
| `tests/remote/` | Verificación contra Supabase real |
| `tests/e2e/` | Camino principal en navegador real (Playwright) con servidor local mock |

**Toda lógica nueva comienza con una prueba:** escribir la prueba unitaria, ejecutarla y observar el fallo esperado; implementar lo mínimo y verla pasar. Para cambios de esquema, escribir primero la prueba de integración de la regla de datos. Cada endpoint nuevo o modificado necesita al menos una prueba de integración. Antes de entregar, la suite completa debe pasar en verde; siguen aplicando los demás criterios de aceptación y la DoD de la historia.

```powershell
npm run test:unit
npm run test:integration
npm test
npx playwright install chromium   # solo la primera vez
npm run test:e2e
```

`test:e2e` recorre login → menú → encuesta → listado → detalle → listado con el perfil A del mock y falla ante errores de consola, excepciones no controladas o respuestas 4xx/5xx del sitio. No está incluida en `npm test`; CI la ejecuta en un paso propio.

Las pruebas locales no necesitan claves ni modifican la base compartida. Las pruebas remotas necesitan `.env` y solo consultan datos; la de accesos falla si las migraciones `accesos_prueba`, `acceso_demo` y `revocacion_sesiones` no están aplicadas. Agregar pruebas después de desarrollar no acredita TDD.

H2: `/api/menu` valida sesión y consulta cuentas por `perfil_id` y estado de encuesta por `preferencias_usuario.usuario_id`. Una fila existente no implica encuesta completada: se utiliza `encuesta_completada`. Sus campos de estado/destino se conservan por compatibilidad. Con H19, Login abre el menú y Para Ti dirige a la zona de promociones; allí se relee `/api/preferencias` para decidir encuesta pendiente o listado. Si falla esa lectura, se muestra Reintentar sin inventar estado. H3 persiste la selección y el booleano mediante `/api/preferencias`; el menú no escribe preferencias. Véase el apartado H19 para entrada ordinaria desde Omitir y tarjetas múltiples.

La migración `20261009232449_cuentas_menu.sql` registra tabla, índice, permisos y seis cuentas de prueba. También se puede aplicar donde el equipo creó `cuentas` manualmente: no sobrescribe filas existentes. Aplicar ambas migraciones nuevas antes de publicar la revisión H1/H2 y verificar con Supabase real.

La base compartida contiene `perfiles`, `comercios`, `promociones`, `beneficios_tarjeta`, `sucursales`, `preferencias_usuario` y `promociones_guardadas`. Administrar tablas/filas desde Table Editor o SQL Editor con la cuenta propia. Registrar cambios de estructura necesarios en una migración nueva y probarla antes de aplicarla; no modificar migraciones ya aplicadas ni volver a ejecutar la carga inicial en la base compartida.

Para crear el archivo de una nueva migración desde el repo:

```powershell
npx --no-install supabase migration new nombre_del_cambio
```

### Versiones, regreso y respaldo de datos

Los datos viven siempre en el esquema de la última migración; las migraciones solo avanzan y nunca se revierten. Volver a una versión anterior de producción es únicamente el rollback de Vercel: la base no se toca y conserva los datos escritos por cualquier versión.

- **Manifiesto:** `supabase/versiones.json` asocia cada PR fusionado en main con su SHA de merge y la última migración que exige. Al fusionar un PR, añadir su entrada al final. `regreso: true` marca las versiones a las que se garantiza volver; PR 1–12 quedan como historial con `false` porque PR 13 reescribió cuentas/tarjetas de forma incompatible.
- **Expand/contract:** mientras la versión en producción sea destino de regreso, una migración nueva solo puede agregar (tablas, columnas con default, constraints que esa versión ya cumpla). Quitar, renombrar o regenerar datos se hace en una migración posterior, cuando la versión que lo necesitaba deja de ser destino de regreso.
- **Prueba de regreso:** `npm run test:regreso` extrae el código de la última versión del manifiesto, sustituye sus migraciones por las actuales y ejecuta su suite. Si falla, la migración nueva rompe el regreso. Requiere el historial de git (CI usa `fetch-depth: 0`) y usa las dependencias instaladas del proyecto actual.
- **Foto de datos:** antes de aplicar una migración a la base compartida, ejecutar el workflow manual «Respaldo de datos» de GitHub Actions o `npm run respaldo -- crear`. La foto se guarda en el bucket privado `respaldos` de Supabase Storage (`<migración>/<fecha>-<commit>.json`), visible desde el Dashboard; el script crea el bucket si no existe. El workflow necesita los secrets `SUPABASE_URL` y `SUPABASE_SECRET_KEY` del repositorio. Las tablas `sesiones_*` no se respaldan.
- **Restaurar:** `npm run respaldo -- listar` y `npm run respaldo -- restaurar <ruta>` simulan; con `--confirmar` hacen upsert por clave primaria en orden de dependencias. Solo se acepta una foto de la misma migración que la última local, que debe coincidir con la aplicada en la base. No borra filas creadas después de la foto.
- El repositorio es público: no guardar fotos como artifacts ni en el repo, y no imprimir filas en los registros.

Guardar en Supabase catálogo y elecciones persistentes por usuario. Filtro, búsqueda, orden temporal, navegación, borradores, zoom/centro, ubicación del visitante y distancias quedan locales. H9 conserva solo un último identificador local por perfil, sin historial. Las operaciones privadas de usuario deben validar sesión y propietario en backend; la clave privada no valida la identidad del visitante.

## 6. Vercel, cuando sea necesario

[Proyecto en Vercel](https://vercel.com/idk-bro6/los-extras-banco-agricola) · [Aplicación publicada](https://project-ovx0k.vercel.app).

El proyecto compartido utiliza **Hobby**. Ese plan no incluye colaboración de equipo como Pro: no asumir que todos podrán administrar el panel compartido con sus cuentas. El trabajo diario se realiza con GitHub y el servidor local; la administración de Vercel corresponde a quien tenga acceso al proyecto. No crear otro proyecto ni cambiar de plan para seguir esta guía. [Límites de Hobby](https://vercel.com/docs/plans/hobby).

Si la cuenta tiene acceso al proyecto, instalar la CLI e iniciar sesión:

```powershell
npm install --global vercel
vercel login
vercel link --project los-extras-banco-agricola --scope idk-bro6
vercel project inspect --non-interactive
```

En el enlace, seleccionar el **proyecto existente** y comprobar que el propietario es `idk-bro6` y el proyecto `los-extras-banco-agricola`. Si no aparece o se deniega el acceso, detenerse y solicitarlo; no enlazar otro proyecto. [Vercel link](https://vercel.com/docs/cli/link).

Las variables del backend son las mismas cuatro de `.env.example`. En Vercel se configuran desde Settings → Environment Variables para el entorno que corresponda. La clave privada y `SESSION_SECRET` deben guardarse como **Secret**; no incluirlas en archivos públicos. Sin `SESSION_SECRET` (Production y Preview) el login responde 503. Para que el login valide contra la base, Vercel necesita `DATA_SOURCE=supabase` con `SUPABASE_URL` y `SUPABASE_SECRET_KEY`, y las migraciones `accesos_prueba` y `acceso_demo` aplicadas. Cambiar variables no modifica deployments anteriores: el siguiente despliegue debe usar la configuración nueva. No es necesario desplegar para ejecutar el servidor local.

Si existen variables de **Development**, se pueden descargar a un archivo aparte para revisarlas sin sobrescribir `.env`:

```powershell
vercel env pull .env.vercel --environment=development
```

Completar manualmente las tres variables necesarias en `.env`. Nuestro servidor carga `.env`, no `.env.local` ni `.env.vercel`; una descarga tampoco garantiza que incluya las claves privadas necesarias. Los archivos `.env.*` y `.vercel/` están ignorados por Git. [Vercel env](https://vercel.com/docs/cli/env).

## 7. Problemas frecuentes

| Problema | Comprobación |
| --- | --- |
| `npm.ps1` bloqueado en PowerShell | Usar `npm.cmd ci` o `npm.cmd run dev`, sin cambiar políticas del sistema. |
| `EADDRINUSE` | Detener el servidor anterior que usa el puerto 3000. |
| API responde 503 | Revisar las variables y reiniciar el servidor. |
| Login responde 503 | En Vercel, comprobar `SESSION_SECRET`; con Supabase, que las migraciones `accesos_prueba` y `acceso_demo` estén aplicadas. |
| `Invalid API key` | Copiar la clave privada completa, sin puntos de ocultación. |
| Las pruebas locales pasan pero no conecta Supabase | Ejecutar `npm run test:remote`; comprueba la conexión real por separado. |
| No aparece el proyecto en Supabase/Vercel | Confirmar cuenta, invitación y permisos de acceso. |

Referencia operativa del equipo: [SCRUM-63](https://somos-agilistas.atlassian.net/browse/SCRUM-63). Consultar también los criterios de aceptación y la DoD en la historia que se esté desarrollando.

## 8. Midi: administrar los datos localmente

Desde la raíz del repositorio, con Node 24, `npm ci` y el `.env` configurado:

```powershell
npm run midi
```

Abrir `http://127.0.0.1:3001`. La herramienta está en `hola/`; no se publica con las pantallas de `public/`. `SUPABASE_URL` y `SUPABASE_SECRET_KEY` permanecen en Node. Midi administra Supabase real independientemente de `DATA_SOURCE`; no utiliza el catálogo mock.

El proyecto destino necesita las migraciones `midi_administracion`, `midi_borrado_revocaciones` y `midi_categorias`, que preparan lectura conjunta, guardado transaccional, categorías administrables y permisos del backend. Fueron aplicadas al proyecto compartido el 13 de octubre de 2026 (la última tiene versión UTC `20261014024012`). El selector posterior del login requiere también `20261014212538_login_usuarios_prueba.sql`, que prepara la clave ficticia y el valor inicial de primera apertura para altas desde Midi. Un proyecto distinto necesita aplicar las migraciones en orden mediante su flujo autorizado; no ejecutar de nuevo las cargas iniciales sobre la base compartida.

El árbol lateral contiene usuarios y el catálogo de promociones. En `Promociones → Categorías` se crean las categorías que utiliza la encuesta; Propiedades → Comercios permite asociar varios locales a cada categoría. Al desplegar una categoría se accede a sus comercios y, desde cada comercio, a sus ofertas. El botón Asociar comercios recupera esa selección; Nuevo dentro de la categoría permite crear un comercio ya vinculado. Comercios y Beneficios por tarjeta conservan sus vistas generales. Se puede editar directamente la cuadrícula o usar Propiedades. Las claves existentes están bloqueadas; cambiar Nombre no cambia el ID. Contraseña vacía en una edición conserva la actual; `NULL` en usuario de acceso retira también su hash. Al crear perfiles se requieren usuario y contraseña.

Perfil rápido agrega un usuario con ID y acceso legibles (`usuario-001`, etc.), contraseña `123` editable, Básica/Black, cero a tres cuentas y encuesta pendiente. Evita los IDs/accesos cargados y los creados en el borrador; la base rechaza posibles duplicados de otra instancia. Las cuentas nuevas usan IDs como `cuenta-001`. Los identificadores anteriores se conservan. Generar, editar, cambiar de sección o aceptar Propiedades solo cambia el borrador. Guardar se pone azul cuando hay cambios y aplica el conjunto; Cancelar lo descarta. Actualizar conserva los campos editados, trae los demás valores y exige revisar los registros que cambiaron externamente. Ante un alta ya existente o una edición eliminada, se conserva el borrador y se informa del conflicto.

Para imágenes de categorías, logos de comercios y fotos de ofertas, arrastrar el archivo sobre el campo o usar Elegir imagen. Se admiten PNG/JPG/WebP de hasta 2 MB, diez archivos y 8 MB de imágenes por guardado. La vista previa permanece en el navegador hasta Guardar; Cancelar no sube el borrador. No hay fotos de perfil. Al guardar, Node escribe los archivos en `public/recursos/midi/` con nombre derivado del contenido y envía solo su ruta a Supabase. Repetir la misma imagen reutiliza el archivo. Los archivos quedan locales: incluirlos en una publicación requiere el flujo habitual de Git/despliegue, no ocurre automáticamente por guardar en Midi. Quitar una imagen retira la referencia, sin borrar archivos que puedan estar compartidos. Un guardado remoto fallido puede dejar el archivo ya escrito; se conserva para reintentar y no se borra automáticamente.

Al eliminar un perfil se retiran sus cuentas, preferencias, guardadas y revocaciones. Al eliminar ofertas se retiran beneficios y guardadas. Los comercios con ofertas o sucursales no se eliminan mientras existan esas referencias. No se puede desvincular un comercio de una categoría mientras tenga ofertas en ella, ni borrar una categoría todavía usada por comercios, ofertas o preferencias. Midi muestra las dependencias y pide confirmación antes de guardar las bajas.

Límites por proceso: una RPC para leer las ocho tablas administradas, caché compartida de 30 segundos y agrupación de lecturas concurrentes; ninguna consulta por celda, pestaña o generación. Cada Guardar hace una RPC y devuelve la lectura actualizada. Se admiten hasta 200 cambios/1 MB de datos por lote, más las imágenes dentro de un cuerpo HTTP local máximo de 12 MB, con intervalo mínimo de dos segundos y máximo de diez guardados por minuto. Los bytes de imagen no se mandan a Supabase. El identificador de petición deduplica reintentos durante diez minutos. Un fallo de lectura aplica enfriamiento de cinco segundos. Si se pierde la respuesta de un guardado, comprobar su resultado antes de iniciar otra petición; la deduplicación local se pierde al reiniciar el servidor.

Pruebas aisladas, incluidas también en `npm test`:

```powershell
npm run test:midi
npm test
```

Comprobación remota explícita:

```powershell
npm run test:midi:remote
```

La prueba remota crea un perfil con ID legible y registros de catálogo UUID propios, comprueba categoría nueva con varios comercios, login/cuentas/encuesta/promociones, edición y rollback, y elimina exclusivamente esos registros al finalizar. Consulta previamente los IDs ocupados. No modifica A, B o demo ni vacía tablas compartidas. Hace como máximo siete RPC de Midi, además de las consultas de los endpoints del producto. Requiere `DATA_SOURCE=supabase` y las migraciones aplicadas; los errores de red o permisos pueden impedir la limpieza, que debe revisarse si falla.

Para probar el perfil desde la aplicación, ejecutar `npm run dev` en otra terminal y abrir `http://127.0.0.1:3000`. Si el puerto 3001 está ocupado, cerrar la instancia anterior o definir `MIDI_PORT` en `.env`.

## 9. H19: menú y datos por usuario — 14 de octubre de 2026

El menú utiliza la guía de UI y las referencias de Cuentas/Tarjetas, con accesos funcionales de Mensajería, Perfil, productos disponibles y Gestiones. Metas permite crear, editar y eliminar un objetivo y registrar su avance manualmente; no mueve saldos. Compartir cuenta utiliza su número completo ficticio. Puntos BA es consulta, sin canje. QR y Apple Wallet están excluidos.

La migración `20261014153434_h19_productos_menu.sql` fue aplicada al proyecto compartido el 14 de octubre. Una base distinta necesita esa migración después de las anteriores, sin repetir la carga sobre una base ya preparada. Añade `productos_tarjeta`, `tarjetas_usuario`, `puntos_usuario`, `mensajes_usuario`, `metas_usuario` y `cuentas.numero_completo`, conservando las cuentas y saldos anteriores. Los perfiles nuevos tienen accesos propios:

| Usuario | Clave de prueba | Tarjetas | Perfil de promociones |
| --- | --- | --- | --- |
| `h19.usuario.001` | `H19Prueba2026` | 2 | Básica; encuesta pendiente |
| `h19.usuario.002` | `H19Prueba2026` | 3 | Black; intereses registrados |
| `h19.usuario.003` | `H19Prueba2026` | 4 | Básica; intereses registrados |

Las letras y números del menú usan CIB Sans Light/Bold localmente, por corrección posterior del usuario; no se atribuye OFL a CIB. Fuente de los productos: [catálogo de débito](https://www.bancoagricola.com/tarjetas-de-debito) y [catálogo de crédito](https://www.bancoagricola.com/tarjetas-de-credito), consultados el14 de octubre. Nombres/redes identifican el producto visual; sus referencias, montos y puntos son datos ficticios guardados en la base. No se copiaron condiciones reales de crédito ni promociones reales a esos registros.

`GET /api/menu` conserva sus campos H2 y añade `tarjetas`, `puntos`, `productosDisponibles` y `mensajesPendientes`. `GET/PATCH /api/mensajes` consulta y marca leído; `GET/POST/PATCH/DELETE /api/metas` administra metas. Cada operación exige la sesión y filtra por propietario en backend. No se usa Supabase Auth ni se expone la clave privada; las nuevas tablas tienen RLS y permisos de backend restringidos, sin acceso directo de `anon/authenticated`.

El botón Para Ti abre `/promociones.html?entrada=menu`. Esa entrada relee preferencias y resuelve encuesta pendiente; una entrada ordinaria desde Omitir no vuelve a forzarla. La API de promociones mantiene su filtro actual Básica/Black y categorías. Mostrar varias tarjetas no modifica ese filtro ni selecciona una tarjeta de H16.

Todos estos registros son editables mediante Table Editor/SQL con acceso autorizado. La carga inicial quedó reproducible en la migración; no cambia valores al recargar la página. `backend/datos-menu.json` es el equivalente aislado para mock/pruebas, no la fuente usada con `DATA_SOURCE=supabase`. La ampliación de Midi para editar/aleatorizar estas entidades está acordada solo como documentación futura: aún no dispone de sus editores ni de un botón para regenerar esos datos. No confundir sus controles actuales de Perfil rápido con esa ampliación.

Comprobación aislada: `npm test`. `npm run test:remote` incluye la prueba H19 de los tres perfiles y CRUD de una meta temporal propia; esa prueba requiere la migración y retira su meta al finalizar. No modifica cuentas/saldos ni preferencias de A/B/demo. Mantener las credenciales de prueba en esta guía, fuera de la interfaz.
