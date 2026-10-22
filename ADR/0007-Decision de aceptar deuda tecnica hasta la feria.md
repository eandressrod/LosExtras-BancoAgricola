# ADR-007: Aceptar el patrón de repositorios duales y los datos de desarrollo duplicados hasta la feria

- Estado: aceptada.
- Fecha del registro y de la decisión: 22 de octubre de 2026.
- Decide: Product Owner operativo y equipo, en el taller de deuda técnica de la sesión 23. Incorpora las observaciones del equipo Alambre Ágiles.
- Clasificación: puerta de dos vías: la deuda puede pagarse después de la feria sin cambiar contratos de la API ni datos.
- Fuente: [inventario del taller](<../docs/TALLER_DEUDA_TECNICA.md>), hallazgos 6 y 7.

## Contexto

El 22 de octubre inventariamos la deuda técnica del código de los sprints 1 a 3 y decidimos, para cada hallazgo, si pagarlo según cada cuánto nos cobra intereses y cuánto cuesta. Lo que cobra interés alto se paga en el Sprint 4 con tarjetas de mantenimiento. El desorden se limpia. Quedaron dos deudas cuyo pago no cabe en el Sprint 4 (26 al 30 de octubre) ni en la estabilización (2 al 5 de noviembre), que deben dedicarse al motor de promociones beta ([ADR-004](<0004-Decision de usar un motor de promociones recomendadas.md>)):

1. **Repositorios duales.** Cada repositorio tiene una variante mock y otra de Supabase. Un repositorio nuevo exige tocar `backend/repositorios/index.js`, su `.mock.js`, su `.supabase.js` y `contrato.js`. El patrón compró algo concreto: probar todo sin claves de Supabase. Rehacerlo costaría 4 horas o más.
2. **Datos de desarrollo duplicados.** Los perfiles, cuentas y tarjetas ficticios están copiados a mano entre `backend/datos.js`, `backend/datos-menu.json` y las migraciones de `supabase/`. Compró desarrollar y probar en local sin base de datos. [ADR-006](<0006-Decision de usar una fuente unica para el catalogo.md>) ya resolvió esto para el catálogo. Pagarlo para el resto costaría unas 3 horas.

El borrador del taller también aceptaba `public/js/menu.js` y Midi. El equipo Alambre Ágiles señaló que `menu.js` es desorden y no deuda: cada pantalla «se agregó donde cabía», sin una decisión que comprara algo. Lo reclasificamos y queda fuera de este ADR. Midi se retira según [ADR-008](<0008-Decision de retirar Midi.md>).

## Decisión

Hasta la feria del 6 de noviembre de 2026 aceptamos cargar:

1. **El patrón de repositorios duales, con interés medio.** El motor beta necesitará repositorios nuevos para las señales declaradas, así que este patrón sí cobrará en el Sprint 4. Para que no se desincronice, cada repositorio nuevo entra con sus variantes mock y Supabase, y su contrato, en el mismo PR.
2. **Los datos de desarrollo duplicados, con interés bajo.** Las historias H21 a H23 no cambian perfiles, cuentas ni tarjetas. Si una historia del motor tiene que cambiarlos, esa historia paga la deuda: genera el mock y la migración desde una sola fuente, como hizo H24 con el catálogo.

`public/js/menu.js` queda como desorden reconocido. No se reescribe en el Sprint 4, pero quien lo toque lo deja un poco mejor de como lo encontró (regla del campamento).

Revisaremos esta decisión si alguna de estas zonas empieza a tocarse cada sprint.

## Alternativas consideradas

- **Pagar todo en el Sprint 4:** sumaría más de 7 horas a las 9 a 10 de las tarjetas de mantenimiento y dejaría al motor sin capacidad.
- **Aceptar también `menu.js` como deuda:** descartado. No podemos explicar qué ganamos con él, así que es desorden.
- **Aceptar Midi congelado:** era el borrador del taller. Se sustituyó por retirarlo ([ADR-008](<0008-Decision de retirar Midi.md>)).

## Consecuencias

**Positivas**

- Las horas del Sprint 4 se dedican al motor beta y a las tarjetas de mantenimiento que sí cobran interés alto.
- No arriesgamos regresiones en pantallas ya aceptadas.

**Negativas**

- Cada repositorio nuevo del motor costará cuatro archivos y puede dejar el mock distinto de Supabase si alguien olvida una variante.
- Si un dato ficticio cambia en la base y no en el mock, las pruebas locales pasarán con datos que no coinciden con los publicados.
- `menu.js` seguirá siendo lento de leer y de cambiar.
