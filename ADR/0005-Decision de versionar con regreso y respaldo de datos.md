# ADR-005: Versiones, regreso en Vercel y respaldo de datos

- Estado: aceptada.
- Fecha del registro y de la decisión: 20 de octubre de 2026.
- Decide: Product Owner operativo.
- Clasificación: puerta de dos vías: el mecanismo puede sustituirse sin migrar datos, aunque mientras rija limita las migraciones a cambios aditivos.
- Fuente técnica: sección «Versiones, regreso y respaldo de datos» de `docs/GUIA_DESARROLLO.md`; `scripts/respaldo.js`, `scripts/respaldo-datos.js`, `.github/workflows/respaldo.yml`, `supabase/versiones.json`.

## Contexto

La aplicación se publica en Vercel desde `main` y guarda catálogo, perfiles y elecciones por usuario en una base compartida de Supabase. Con el motor de promociones ([ADR-004](<0004-Decision de usar un motor de promociones recomendadas.md>)) la base acumula más datos del usuario (señales del perfil), por lo que equivocarse al publicar tiene más costo.

Problema: Vercel permite volver el código a una versión anterior en un clic, pero la base es una sola. Si una migración cambia el esquema de forma incompatible, el código anterior deja de funcionar aunque se haga rollback. Además, una migración defectuosa puede dañar datos.

Se necesitaba un sistema que:

- permita **volver a una versión anterior del código** sin tocar ni perder datos;
- permita **recibir y restaurar respaldos** de la base;
- no requiera infraestructura nueva ni ponga datos en un repositorio público.

## Decisión

Separar el problema en tres mecanismos complementarios.

1. **Regreso = rollback de Vercel; la base no se toca.** Los datos viven siempre en el esquema de la última migración. Las migraciones solo avanzan, nunca se revierten, y la base conserva los datos escritos por cualquier versión.
2. **Reglas de adición (expand/contract).** Mientras una versión sea destino de regreso, una migración nueva solo puede *agregar*: tablas, columnas con valor por defecto y restricciones que esa versión ya cumpla. Quitar, renombrar o regenerar datos se hace en una migración posterior, cuando la versión que lo necesitaba deja de ser destino de regreso.
3. **Manifiesto y prueba de regreso.**
   - `supabase/versiones.json` asocia cada PR fusionado en `main` con su SHA de merge y la última migración que exige; `regreso: true` marca las versiones a las que se garantiza volver (PR 1–12 quedan como historial porque PR 13 reescribió cuentas/tarjetas de forma incompatible).
   - `npm run test:regreso` extrae el código de la última versión del manifiesto, le sustituye las migraciones por las actuales y ejecuta su suite. Si falla, la migración nueva rompe el regreso. CI lo ejecuta con `fetch-depth: 0`.
4. **Foto de datos en bucket privado.** Antes de aplicar una migración a la base compartida se ejecuta el workflow manual «Respaldo de datos» de GitHub Actions o `npm run respaldo -- crear`. La foto se guarda como JSON en el bucket privado `respaldos` de Supabase Storage (`<migración>/<fecha>-<commit>.json`). El script verifica que el bucket sea privado y se niega a continuar si es público.
5. **Restauración controlada.** `npm run respaldo -- listar` y `restaurar <ruta>` simulan por defecto; con `--confirmar` hacen upsert por clave primaria en orden de dependencias. Solo acepta una foto de la misma migración que la última local, que debe coincidir con la aplicada en la base. No borra filas creadas después de la foto.

GitHub aporta la **ejecución** (Actions, secretos `SUPABASE_URL` y `SUPABASE_SECRET_KEY`, historial de git para el manifiesto y la prueba de regreso); los **datos** nunca se guardan en GitHub.

## Por qué esta opción

- **Regreso barato y seguro.** Si la base solo crece de forma compatible, volver el código es suficiente y no hay que restaurar datos en el caso común.
- **Los datos de usuarios no se pierden al volver.** No hay «base antigua» que reemplace a la actual: la base actual sirve a la versión antigua gracias a las reglas de adición.
- **Verificable, no basado en disciplina.** La prueba de regreso falla en CI si una migración rompe la versión anterior.
- **Sin servicios nuevos.** Usa GitHub Actions, Supabase Storage y Vercel, que el proyecto ya tiene.
- **Apto para recibir respaldos.** Al ser el esquema siempre «el último», una foto de la misma migración puede restaurarse sin transformaciones.

## Alternativas consideradas

- **Migraciones reversibles (down):** exigen mantener y probar el camino de bajada, y revertir puede destruir datos escritos por la versión nueva.
- **Base por versión o restaurar la base al hacer rollback:** pierde los datos creados después del respaldo y duplica infraestructura.
- **Guardar las fotos como artifacts de Actions o en el repositorio:** descartado; el repositorio y los registros son públicos.
- **Solo confiar en los respaldos propios de Supabase:** no resuelve la compatibilidad código/esquema y depende del plan contratado.

## Consecuencias

**Positivas**

- Rollback de código sin intervención en la base.
- Cambios destructivos de esquema posibles, pero diferidos y explícitos.
- Respaldo previo a cada migración con restauración simulable.

**Negativas / limitaciones**

- Las migraciones están restringidas a cambios aditivos mientras exista una versión con `regreso: true`; el esquema acumula elementos hasta que se hace la fase «contract».
- Hay que **mantener el manifiesto**: cada PR fusionado debe añadir su entrada.
- La foto es **manual** (`workflow_dispatch`): no hay respaldo programado y depende de que alguien lo ejecute antes de migrar.
- Las tablas `sesiones_*` no se respaldan.
- La restauración hace upsert y **no borra** filas creadas después de la foto; no es un retorno exacto al instante del respaldo.
- Las fotos contienen datos de usuarios (ficticios en este proyecto): el bucket debe seguir privado y no deben imprimirse filas en los registros.
- La prueba de regreso usa las dependencias del proyecto actual, por lo que no detecta incompatibilidades de dependencias entre versiones.
- A medida que crezca el perfil del motor ([ADR-004](<0004-Decision de usar un motor de promociones recomendadas.md>)), el tamaño de cada foto y el tiempo de respaldo/restauración crecen; el límite de tiempo del workflow es de 5 minutos.

## Estado de verificación

Este ADR describe el diseño según el código y la guía del repositorio. No acredita que los secretos, el bucket o el workflow estén configurados y funcionando en GitHub/Supabase en este momento; eso requiere comprobación aparte.
