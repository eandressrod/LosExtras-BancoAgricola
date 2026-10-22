# Taller de deuda técnica del proyecto Los Extras

Metodologías Ágiles de Desarrollo · Ing. Juliana Ceballos · Jueves, 22 de octubre de 2026.

Equipo: David Ignacio Argueta Valles, Sara Nicole Meléndez Ortez, Samuel André Mojica Mercado, Ernesto Andrés Rodríguez Sandoval y German Eduardo Suazo Aparicio.

Este documento conserva el contenido del taller entregado. Las decisiones finales están en [ADR-007](<../ADR/0007-Decision de aceptar deuda tecnica hasta la feria.md>), que incorpora las respuestas de la tabla 4, y en [ADR-008](<../ADR/0008-Decision de retirar Midi.md>), que retira Midi después del taller.

Revisamos completo el repositorio en su estado del 21 de octubre de 2026 (rama `main`, commit `0fcc663`): API, backend, interfaz, scripts, pruebas y Midi. Cada hallazgo señala el archivo donde se encuentra. Las zonas críticas (sesión, promociones, guardadas y API) ya tienen pruebas unitarias, de integración y de extremo a extremo en la integración continua, así que esa señal no aparece en el inventario.

## Inventario de la deuda

**Tabla 1.** *Hallazgos de deuda técnica en el código de los sprints 1 a 3*

| # | Qué encontramos y dónde | ¿Deuda o desorden? | Si es deuda: ¿qué tipo? |
| --- | --- | --- | --- |
| 1 | La tarjeta de promoción está copiada en `public/js/promociones.js` (`crearOferta`) y `public/js/guardadas.js` (`tarjeta`). El texto «Aplica a tu tarjeta Black/Básica» se arma igual en tres archivos, incluido `detalle.js`, aunque `comun.js` ya tiene `cardShortName`. | Deuda | Accidental prudente: se copió para entregar Guardadas; ahora vemos que debía ser una pieza compartida. |
| 2 | Guardar/Quitar existe dos veces: `alPulsarGuardar` en `public/js/guardar-promo.js` y una copia en línea en `public/js/promociones.js`, que además no desactiva el botón durante la petición. | Desorden | No aplica: la copia no compró nada. |
| 3 | Código sin uso: `categories` y `loadPreferences` en `public/js/comun.js` (preferencias en `localStorage` del alcance anterior al 7 de octubre); `listarPromociones` y `buscarPromocion` en `backend/promociones.js`, sin llamadas, y el catálogo H4 de tres promociones en `backend/datos.js`. | Desorden | No aplica: es código que nadie se atrevió a borrar. |
| 4 | Agregar un endpoint obliga a tocar tres lugares: la rewrite en `vercel.json`, el mapa de `api/recursos.js` y la tabla de rutas de `scripts/dev.js`. La validación de sesión con respuesta 401 se repite en diez handlers. | Deuda | Deliberada prudente: agrupar rutas permitió no superar el límite de 12 funciones del plan Hobby de Vercel. |
| 5 | `public/js/menu.js` tiene 311 líneas densas dentro de un solo `DOMContentLoaded`, con unas 20 funciones internas y estado compartido; mezcla dibujo, estado, llamadas a la API y diálogos. Lo mismo ocurre en `hola/app.js` (Midi, 24 KB). Son los archivos que nadie quiere abrir. | Deuda | Deliberada imprudente: cada pantalla del menú se agregó donde cabía, sin medir el costo. |
| 6 | Cada repositorio nuevo exige tocar `backend/repositorios/index.js`, su variante `.mock.js`, su variante `.supabase.js` y `contrato.js`; el caché de las instancias es inconsistente. Hay nombres que no dicen qué contienen: `mock.js`, `supabase.js`, `datos.js`. | Deuda (patrón) y desorden (nombres) | Deliberada prudente en el patrón: la doble implementación permite probar sin claves de Supabase. |
| 7 | Los perfiles, cuentas y tarjetas ficticios están copiados a mano entre `backend/datos.js`, `backend/datos-menu.json` y las migraciones de `supabase/`. El ADR-006 resolvió esto solo para el catálogo. | Deuda | Deliberada prudente: permitió desarrollar y probar en local sin base de datos. |
| 8 | Valores repetidos a mano: la redirección a `/index.html` ante un 401 en cuatro archivos, aunque existe `volverAlLogin`; el `20000` sin nombre en `public/pwa/inactividad-modelo.js`; la lista de hosts locales en `backend/config/supabase.js` y `backend/servicios/sesion.js`. | Desorden | No aplica. |

## Costo de cargar la deuda

Decidimos con la frecuencia con que tocamos cada zona y no con lo fea que nos parece. Lo que cambiará el motor de promociones beta en el Sprint 4 cobra interés alto; lo que no se tocará antes de la feria cobra interés bajo.

**Tabla 2.** *Frecuencia de interés, costo de pago y decisión para cada hallazgo*

| # | Hallazgo | ¿Cada cuánto nos cobra? | ¿Qué costaría pagarla? | Decisión |
| --- | --- | --- | --- | --- |
| 1 | Tarjeta copiada | Alto: H21 a H23 cambiarán la tarjeta del listado | 3 h | Pagar ya (T1) |
| 2 | Guardar duplicado | Alto: se toca junto con la tarjeta y ya se comporta distinto | 1 h | Pagar ya (T1) |
| 3 | Código sin uso | Medio: confunde al trabajar con el catálogo de H24 | 1.5 h | Pagar ya (T2) |
| 4 | Rutas en tres lugares | Medio: el motor necesita endpoints nuevos | 3 a 4 h | Por partes (T3) |
| 5 | `menu.js` y Midi | Bajo: el menú no es el foco del Sprint 4 y Midi está congelado | 8 h o más | Aceptar (ADR-007) |
| 6 | Repositorios duales | Medio en el patrón; bajo en los nombres | 4 h o más | Aceptar el patrón (ADR-007); renombrar si sobra tiempo |
| 7 | Datos ficticios copiados | Bajo: los perfiles no cambian desde el 16 de octubre | 3 h | Aceptar (ADR-007) |
| 8 | Valores repetidos | Bajo | 1 h | La redirección se limpia en T1; el resto, si sobra tiempo |

## Plan para el Sprint 4

### Lo que se paga

Los hallazgos para pagar ya o por partes se convierten en tarjetas de mantenimiento o mejora del Sprint 4. Así queda capacidad para el motor de promociones beta antes de la estabilización.

**Tabla 3.** *Tarjetas de pago de deuda para el Sprint 4*

| Tarjeta en el tablero | ¿Qué mejora concretamente? | Horas estimadas |
| --- | --- | --- |
| T1 · Unificar la tarjeta de promoción y la acción Guardar | Una sola forma de dibujar la tarjeta y de guardar o quitar una promoción para el listado y Guardadas; los cambios del motor beta se hacen en un solo lugar. | 4 h |
| T2 · Retirar código sin uso del alcance anterior | Elimina las preferencias locales y el catálogo H4 que ya nadie llama, para que solo quede el catálogo vigente. | 1.5 h |
| T3 · Una sola tabla de rutas de la API y validación de sesión común | Agregar un endpoint exige tocar un solo lugar y la validación de sesión deja de copiarse en cada handler. | 3.5 h |

Las tres son refactorizaciones: no cambian el comportamiento y se apoyan en la suite de pruebas existente para comprobarlo.

- **T1. Unificar la tarjeta de promoción y la acción Guardar.** Problema: el listado y Guardadas construyen la tarjeta con código copiado, y Guardar/Quitar existe dos veces con comportamientos distintos; cada cambio del motor beta habría que hacerlo en dos o tres lugares. Mejora: una sola función de tarjeta en `promocion-vista.js` que usen `promociones.js` y `guardadas.js`; el listado usa `alPulsarGuardar`; el texto de la tarjeta aplicable sale de `cardShortName` y las respuestas 401 usan `volverAlLogin`. Hecho cuando: la interfaz se ve igual que antes, no queda código duplicado en esos archivos y la suite completa y la prueba de extremo a extremo pasan en verde.
- **T2. Retirar código sin uso del alcance anterior.** Problema: siguen en el repositorio las preferencias en `localStorage` de `comun.js` y el catálogo H4 con `listarPromociones` y `buscarPromocion`, que nadie llama. Mejora: eliminarlos junto con lo que quede huérfano en el contrato y en los repositorios. Hecho cuando: no queda ninguna referencia a ese código y la suite pasa en verde.
- **T3. Una sola tabla de rutas de la API y validación de sesión común.** Problema: un endpoint nuevo exige tocar `vercel.json`, `api/recursos.js` y `scripts/dev.js`, y la validación de sesión está copiada en diez handlers. Mejora, por partes: primero, que `scripts/dev.js` derive sus rutas de las rewrites de `vercel.json`; después, un helper que entregue el perfil de la sesión o responda 401. Hecho cuando: agregar una ruta exige tocar un solo lugar, siguen funcionando las mismas rutas y la suite pasa en verde.

### Lo que se acepta

El borrador del taller aceptaba `menu.js` y Midi, el patrón de repositorios duales y los datos ficticios copiados. La versión final está en [ADR-007](<../ADR/0007-Decision de aceptar deuda tecnica hasta la feria.md>) y [ADR-008](<../ADR/0008-Decision de retirar Midi.md>).

## Intercambio con el equipo Alambre Ágiles

El equipo Alambre Ágiles revisó nuestro inventario con las dos preguntas del intercambio. Las filas 1 a 4 responden si algún hallazgo que llamamos deuda es en realidad desorden; las filas 5 a 7, si algo que aceptamos nos cobrará intereses antes de la feria.

**Tabla 4.** *Observaciones del equipo Alambre Ágiles sobre nuestro inventario y nuestra respuesta*

| # | Lo que nos señaló el otro equipo | ¿Cambiamos algo por eso? ¿Qué? |
| --- | --- | --- |
| 1 | Hallazgo 8 y nombres del hallazgo 6: la constante 20000, la lista de hosts repetida y los nombres confusos (`mock.js`, `datos.js`) son desorden. No deberían quedar para «si sobra tiempo», porque el desorden no se negocia: se limpia. | Sí. Pasan a la tarjeta T2: renombrar `mock.js`, `supabase.js` y `datos.js`, dar nombre al 20000 y dejar una sola lista de hosts locales (≈1.5 h más). |
| 2 | Hallazgo 4: el límite de 12 funciones de Vercel justifica agrupar rutas, pero no justifica copiar la validación de sesión en diez handlers. Esa parte es desorden dentro de un hallazgo de deuda. | Sí. El hallazgo queda como deuda (agrupar rutas) y desorden (validación de sesión copiada). El helper de sesión se hace completo dentro de T3, no como una parte opcional. |
| 3 | Hallazgo 5: decir que cada pantalla «se agregó donde cabía» indica que nadie tomó una decisión, así que `menu.js` es desorden. ¿Qué ganaron a cambio? | Sí, no podemos decir qué ganamos: lo reclasificamos como desorden. Limpiarlo cuesta 8 h o más y no se toca en el Sprint 4, así que aplicaremos la regla del campamento cada vez que se toque y sale del ADR-007. |
| 4 | Hallazgo 6: mezcla deuda y desorden en un solo hallazgo y debería separarse en dos. Además, el caché inconsistente de los repositorios no está justificado. | Sí. Lo separamos: el patrón mock y Supabase sigue como deuda; los nombres y el caché inconsistente pasan a desorden y se limpian en T2 (≈0.5 h más). T2 queda en ≈3.5 h. |
| 5 | Patrón de repositorios (hallazgo 6): no debería aceptarse como deuda de interés bajo. El propio ADR-007 reconoce que cada repositorio nuevo del motor costará cuatro archivos, así que cobrará intereses en el Sprint 4. | Sí. Su interés pasa de bajo a medio. Lo seguimos aceptando porque rehacerlo no cabe en el sprint, pero el ADR-007 lo dirá así y cada repositorio nuevo del motor llevará sus variantes mock y Supabase en el mismo PR. |
| 6 | Hallazgo 7: el motor beta decide según la tarjeta y el perfil. Si cambian esos datos, `backend/datos.js`, `backend/datos-menu.json` y las migraciones se desincronizan antes de la feria, y las pruebas podrían pasar con datos equivocados. | En parte. El catálogo ya tiene fuente única (ADR-006) y H21 a H23 no cambian perfiles ni tarjetas. Agregamos al ADR-007 una condición: si una historia del motor los cambia, esa historia paga la deuda generando el mock y la migración desde una sola fuente. |
| 7 | Hallazgo 5 (pregunta): ¿las señales declaradas del motor se capturan en alguna pantalla del menú? Si es así, tendrán que tocar `menu.js` y su interés dejará de ser bajo. | No. Lo verificamos en el código: `menu.js` no maneja encuesta, preferencias ni rechazos. Las señales se declaran en `encuesta.html`, `preferencias.html` y el listado de promociones, así que su interés sigue siendo bajo. |
