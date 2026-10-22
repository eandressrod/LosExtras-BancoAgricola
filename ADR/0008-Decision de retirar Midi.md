# ADR-008: Retirar Midi y administrar los datos desde Supabase y las migraciones

- Estado: aceptada.
- Fecha del registro y de la decisión: 22 de octubre de 2026.
- Decide: Product Owner operativo y equipo, después del taller de deuda técnica de la sesión 23.
- Clasificación: puerta de dos vías mientras las funciones `midi_*` sigan en la base: el código puede recuperarse de Git. Cuando una migración posterior las retire, volver a Midi exigirá recrearlas.
- Sustituye: las partes de [ADR-006](<0006-Decision de usar una fuente unica para el catalogo.md>) que mantenían opcionales las columnas nuevas para que Midi siguiera creando filas.

## Contexto

Midi (carpeta `hola/`) se propuso para crear datos de prueba rápido y mantener la base de datos desde un script local con interfaz gráfica. Lo arranca `npm run midi` en el puerto 3001 y escribe en Supabase mediante tres funciones de la base: `midi_leer_datos`, `midi_guardar_cambios` y `midi_dependencias`.

Darle mantenimiento resultó muy caro:

- Es una capa compleja: 14 archivos propios, 3 funciones en la base y 10 archivos de prueba, uno de ellos remoto.
- Cada cambio de esquema obliga a planificar también a Midi. H24 tuvo que dejar opcionales sus columnas nuevas y probar aparte que Midi seguía creando filas.
- Desde el 15 de octubre estaba congelado, así que ya no podía editar las columnas nuevas del catálogo. Seguía costando pruebas y compatibilidad sin dar valor nuevo.

Mientras tanto, el catálogo pasó a tener una fuente única versionada (`catalogo/catalogo.json`, [ADR-006](<0006-Decision de usar una fuente unica para el catalogo.md>)). El resto de los datos se puede editar con el Table Editor o el editor SQL de Supabase, y los cambios que deben conservarse se escriben como migraciones.

En el taller de deuda técnica se propuso aceptar Midi congelado hasta la feria. Al revisarlo concluimos que retirarlo es más barato que seguir cargándolo.

## Decisión

1. **Se elimina Midi del repositorio:** la carpeta `hola/`, los scripts `midi`, `test:midi` y `test:midi:remote` de `package.json`, sus pruebas y su sección en `docs/GUIA_DESARROLLO.md`.
2. **Las pruebas de la base que solo pasaban por Midi se reescriben con SQL directo**, para conservar las garantías del producto: categorías protegidas mientras estén en uso, preferencias que solo aceptan categorías existentes y tablas cerradas a visitantes. La prueba remota del login crea y elimina su perfil temporal directamente en Supabase.
3. **Los datos se administran desde Supabase y las migraciones.** Los cambios puntuales se hacen en el Table Editor o el editor SQL. Lo que debe conservarse o reproducirse va en una migración. El catálogo se cambia en `catalogo/catalogo.json`. Las contraseñas ficticias se generan con `npm run hash -- "Clave"`.
4. **Se conserva `public/recursos/midi/`.** Contiene imágenes que la base referencia por su ruta. Moverlas exigiría migrar esas rutas.
5. **Las funciones `midi_*` se retiran de la base en un PR posterior.** [ADR-005](<0005-Decision de versionar con regreso y respaldo de datos.md>) solo permite migraciones aditivas mientras exista una versión destino de regreso, y la versión actual (PR 21) todavía usa esas funciones en su suite. Cuando este PR se fusione y quede registrado como destino de regreso, otra migración las retirará con su prueba.

## Alternativas consideradas

- **Mantener Midi congelado y aceptarlo como deuda:** era el borrador del taller. Seguía exigiendo pruebas y compatibilidad en cada migración y no permitía editar el catálogo nuevo.
- **Ponerlo al día:** habría que adaptar su editor y su esquema a H24 y al motor beta. Cuesta más que la herramienta que reemplaza.
- **Retirar también ahora las funciones de la base:** rompería la prueba de regreso a PR 21 y obligaría a abrir una transición sin destino. Se difiere a un PR posterior.

## Consecuencias

**Positivas**

- Desaparece una capa que había que planificar en cada cambio de esquema. Las migraciones nuevas ya no tienen que mantener compatibilidad con Midi.
- La suite pierde pruebas que verificaban la herramienta y no el producto.
- Los cambios de datos que importan quedan versionados y revisados en PR.

**Negativas**

- Ya no hay una interfaz para crear perfiles de prueba con un clic. Crearlos exige SQL en Supabase y generar el hash con `npm run hash`.
- Las funciones `midi_*` siguen en la base sin uso hasta el PR que las retire.
- La carpeta `public/recursos/midi/` conserva un nombre que ya no corresponde a una herramienta existente.
