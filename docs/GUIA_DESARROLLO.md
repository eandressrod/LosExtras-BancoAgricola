# Guía de desarrollo — Los Extras

Actualizada el 8 de octubre de 2026. Los comandos se ejecutan desde la carpeta del repositorio, donde está `package.json`.

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

El servidor sirve las páginas y ejecuta `/api/perfiles`, `/api/promociones`, `/api/promocion?id=restaurante` y `/api/auth/login`, `/api/auth/sesion`, `/api/auth/logout`. Live Server o abrir un HTML directamente no ejecuta estos endpoints.

Los usuarios de prueba de H1 están guardados en la tabla `perfiles` de Supabase. Sus credenciales se entregan desde esta guía al verificador, fuera de la pantalla de login:

| Perfil | Tarjeta | Usuario | Clave |
| --- | --- | --- | --- |
| A | Básica | `demo.basica` | `Basica2026` |
| B | Black | `demo.black` | `Black2026` |
| demo (general) | Básica | `demo` | `demo123` |

El formulario envía usuario y clave a `/api/auth/login`; el backend busca el usuario en la base y compara la clave con su hash. Con `DATA_SOURCE=supabase` (Vercel y `.env`) se usa la base; `mock` solo sirve para pruebas automáticas y desarrollo sin claves, con los mismos usuarios en `backend/datos.js`. No hay registro, recuperación, MFA ni autenticación bancaria. Al entrar, el backend envía una cookie `HttpOnly` firmada que dura 2 horas. Cada página privada consulta `/api/auth/sesion` para conocer el perfil (`id`, `nombre`, `tipoTarjeta`); el navegador no guarda la identidad. Si cambian los datos de prueba: `npm run hash -- "NuevaClave"`, una migración nueva, `backend/datos.js` y esta guía. La escritura de preferencias remotas y guardadas se implementa en sus historias; mientras tanto, la encuesta existente guarda elecciones localmente por perfil.

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

**Toda lógica nueva comienza con una prueba:** escribir la prueba unitaria, ejecutarla y observar el fallo esperado; implementar lo mínimo y verla pasar. Para cambios de esquema, escribir primero la prueba de integración de la regla de datos. Cada endpoint nuevo o modificado necesita al menos una prueba de integración. Antes de entregar, la suite completa debe pasar en verde; siguen aplicando los demás criterios de aceptación y la DoD de la historia.

```powershell
npm run test:unit
npm run test:integration
npm test
```

Las pruebas locales no necesitan claves ni modifican la base compartida. Las pruebas remotas necesitan `.env` y solo consultan datos; la de accesos falla si las migraciones `accesos_prueba`, `acceso_demo` y `revocacion_sesiones` no están aplicadas. Agregar pruebas después de desarrollar no acredita TDD.

H2: `/api/menu` valida sesión y consulta cuentas por `perfil_id` y estado de encuesta por `preferencias_usuario.usuario_id`. Una fila existente no implica encuesta completada: se utiliza `encuesta_completada`. Login abre el menú; solo el clic en Promociones/Para ti decide entre encuesta pendiente y listado. El cliente relee `/api/menu` al clic y, si la consulta falla, muestra Reintentar sin inventar destino. H3 deberá persistir ese booleano al completar la encuesta: H2 no añade un endpoint de escritura de preferencias.

La migración `20261009232449_cuentas_menu.sql` registra tabla, índice, permisos y seis cuentas de prueba. También se puede aplicar donde Sam creó `cuentas` manualmente: no sobrescribe filas existentes. Aplicar ambas migraciones nuevas antes de publicar la revisión H1/H2 y verificar con Supabase real.

La base compartida contiene `perfiles`, `comercios`, `promociones`, `beneficios_tarjeta`, `sucursales`, `preferencias_usuario` y `promociones_guardadas`. Administrar tablas/filas desde Table Editor o SQL Editor con la cuenta propia. Registrar cambios de estructura necesarios en una migración nueva y probarla antes de aplicarla; no modificar migraciones ya aplicadas ni volver a ejecutar la carga inicial en la base compartida.

Para crear el archivo de una nueva migración desde el repo:

```powershell
npx --no-install supabase migration new nombre_del_cambio
```

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
