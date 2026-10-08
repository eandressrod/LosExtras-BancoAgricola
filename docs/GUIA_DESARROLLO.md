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

## 4. Ejecutar el servidor local

```powershell
npm run dev
```

Abrir **http://127.0.0.1:3000**. Mantener la terminal abierta y detener el servidor con **Ctrl+C**. Reiniciarlo después de cambiar `.env` o archivos del backend.

El servidor sirve las páginas y ejecuta `/api/perfiles`, `/api/promociones` y `/api/promocion?id=restaurante`. Live Server o abrir un HTML directamente no ejecuta estos endpoints.

El acceso actual de la aplicación es `demo` / `demo123`. Los perfiles A/B están preparados en la base; el login por perfil, las preferencias remotas y las guardadas se implementan en sus historias.

## 5. Ubicar archivos y trabajar con TDD

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

Las 19 pruebas locales no necesitan claves ni modifican la base compartida. Las dos pruebas remotas necesitan `.env` y solo consultan datos. Agregar pruebas después de desarrollar no acredita TDD.

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

Las variables del backend son las mismas tres de `.env.example`. En Vercel se configuran desde Settings → Environment Variables para el entorno que corresponda. La clave privada debe guardarse como **Secret**; no incluirla en archivos públicos. Cambiar variables no modifica deployments anteriores: el siguiente despliegue debe usar la configuración nueva. No es necesario desplegar para ejecutar el servidor local.

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
| API responde 503 | Revisar las tres variables y reiniciar el servidor. |
| `Invalid API key` | Copiar la clave privada completa, sin puntos de ocultación. |
| Las pruebas locales pasan pero no conecta Supabase | Ejecutar `npm run test:remote`; comprueba la conexión real por separado. |
| No aparece el proyecto en Supabase/Vercel | Confirmar cuenta, invitación y permisos de acceso. |

Referencia operativa del equipo: [SCRUM-63](https://somos-agilistas.atlassian.net/browse/SCRUM-63). Consultar también los criterios de aceptación y la DoD en la historia que se esté desarrollando.
