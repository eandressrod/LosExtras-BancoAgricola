# ADR-006: Describir el catálogo con una fuente única y vectores de ocasiones

- Estado: aceptada. Se implementa en la Entrega 1 de H24 ([SCRUM-123](https://somos-agilistas.atlassian.net/browse/SCRUM-123), [PR #21](https://github.com/eandressrod/LosExtras-BancoAgricola/pull/21)), pendiente de merge.
- Fecha del registro: 20 de octubre de 2026.
- Fecha de la decisión: del 18 al 20 de octubre de 2026. El 18 se diseñó el algoritmo, el 19 se refinó H24 en Jira y el 20 se fijó el contrato en el PR #21.
- Decide: Product Owner operativo y equipo. La forma técnica del contrato la propuso el desarrollador de H24.
- Clasificación: puerta de una vía dentro del plazo del proyecto. La forma de los datos la consumen H8, H20 a H23 y H25 a H27.

## Contexto

El motor de promociones ([ADR-004](<0004-Decision de usar un motor de promociones recomendadas.md>)) muestra cada promoción como una tarjeta con un **puntaje de relevancia**. Ese puntaje decide el orden en pantalla según el perfil de la persona y la encuesta que completó. El objetivo es armar un perfil con ofertas **parecidas a los gustos declarados, sin limitarse a mostrar solo lo que la persona seleccionó**.

Con categorías solamente, eso no es posible. Quien elige Cinemark vería solo Entretenimiento, aunque una pizzería para planes en familia le pueda interesar. Hacía falta una forma de relacionar comercios de categorías distintas que fuera:

- **fácil de calcular**, sin entrenamiento, servicios externos ni historial de uso;
- **explicable**, para que la persona entienda por qué ve cada oferta;
- **compatible con la regla de no analítica**: solo se usan datos del catálogo y lo que la persona declara.

La idea base fue **representar las relaciones entre negocios con vectores**. Cada comercio se describe con las mismas dimensiones, y la cercanía entre dos comercios se obtiene con una operación sencilla sobre sus vectores.

Para que el motor lea esos datos igual en desarrollo y en producción, el catálogo también necesitaba una sola fuente. Hasta H4 estaba escrito a mano dos veces, en el mock (`backend/catalogo.js`) y en una migración SQL. Ampliarlo a más de 100 promociones con ese método haría que ambas copias se separaran.

## Decisión

1. **Una fuente única versionada.** El catálogo vive en `catalogo/catalogo.json`, con su contrato en `catalogo/esquema.json` (JSON Schema 2020-12). De ella salen:
   - la carga de Supabase, como migración idempotente generada con `npm run catalogo:generar -- <nombre>`;
   - el mock, que lee la misma fuente al iniciar.

   Una prueba falla si la última carga generada no coincide con la fuente.

2. **Cuatro capas por promoción:**

   | Capa | Pregunta | Uso en el motor |
   | --- | --- | --- |
   | Filtros: tarjetas, vigencia, días, canales, sucursales y cobertura | ¿Se puede usar? | Sí o no, antes de puntuar |
   | Taxonomía: categoría y subcategoría | ¿Qué es? | Interés por categoría y una columna por subcategoría en el vector |
   | Ocasiones: 11 valores de 0, 0.5 o 1 | ¿Para qué sirve? | Similitud entre categorías |
   | Atributos de criterio: nivel de precio, canal y tipo de beneficio | ¿Cómo se aprovecha? | Factores propios de cada persona |

3. **El vector de cada comercio.**
   - **Ocasiones:** son 11 y se etiquetan a mano con una rúbrica. Vale 1 si la oferta gira en torno a la ocasión, 0.5 si la incluye en parte y 0 si no aplica.
   - **Subcategoría:** el motor agrega una columna por subcategoría, que vale 1 solo en la propia.
   - **Sobrescritura:** una promoción puede reemplazar las ocasiones y el nivel de precio de su comercio.
   - **Fuera del vector a propósito:**
     - los comercios sensibles (Salud) dejan sus ocasiones vacías y nunca generan sugerencias en otras categorías;
     - «Regalo» es una etiqueta de intención de la visita;
     - precio y canal son atributos de criterio.

4. **La relación entre negocios es la similitud coseno de sus vectores.**
   - La afinidad A de una promoción es el máximo, no el promedio, de su similitud con cada ancla que declaró la persona. Así, agregar un gusto nunca baja la afinidad de otro.
   - La tabla de relaciones (puentes de H27) guarda los casos que el vector no expresa bien. Se crea vacía.

5. **El orden sale del puntaje de cada tarjeta.**
   - La afinidad entra en el término `max(M, 0.65A)` de la fórmula de ADR-004.
   - Un comercio parecido puede subir aunque no se haya elegido, pero nunca supera a uno elegido con la misma intención del día: llega como máximo a 64.25 frente a 65.
   - Así se exploran ofertas similares sin desplazar lo declarado.

6. **Imágenes en el repositorio.** Viven en `public/recursos/` y la base guarda solo su ruta relativa.

7. **Evolución aditiva.**
   - Las tablas y columnas nuevas son opcionales en la base, para que Midi, que no se adapta, siga creando filas. La forma completa la exige la fuente con su validador.
   - Los cambios del contrato se acuerdan y se avisan en las historias que lo consumen, y respetan las reglas de adición de [ADR-005](<0005-Decision de versionar con regreso y respaldo de datos.md>).

## Por qué esta opción

- **Fácil de calcular.** La similitud coseno es un producto punto entre vectores de unas 11 ocasiones más una columna por subcategoría. Se puede precalcular cada vez que cambia el catálogo.
- **Explicable.** La razón de una sugerencia sale de las ocasiones que comparte con lo elegido, por ejemplo «Planes en familia».
- **Escala en lineal.** Cada comercio nuevo se etiqueta una vez con las 11 ocasiones, sin relacionarlo a mano con cada uno de los demás.
- **Sin datos de comportamiento.** Funciona desde la primera visita con solo la encuesta y no necesita volumen de usuarios.
- **Mock y Supabase iguales por construcción.** Ambos salen del mismo archivo, revisable en un PR.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Solo categorías | No sugiere nada fuera de lo elegido; la persona vería solo sus selecciones. |
| Matriz de relaciones comercio a comercio escrita a mano | Crece con el cuadrado del número de comercios y es difícil de mantener coherente. |
| Embeddings o un modelo aprendido sobre los textos | Menos explicable, requiere servicios o dependencias nuevas y no se puede corregir a mano. |
| Filtrado colaborativo o popularidad | Necesita usuarios y datos de comportamiento que no existen, y contradice la regla de no analítica. |
| Catálogo escrito a mano en SQL y en el mock por separado | Las dos copias se separan al crecer el catálogo. |
| Supabase como única fuente, editada desde Midi | Midi no se adapta en esta etapa y los cambios no quedarían versionados ni revisados en Git. |

## Consecuencias

**Positivas**

- Las historias que consumen el catálogo trabajan desde el inicio sobre la forma definitiva de los datos.
- La personalización puede sugerir ofertas de otras categorías con una razón visible.
- Un cambio del catálogo pasa por validador, pruebas y PR antes de llegar a la base.

**Negativas o pendientes**

- **Calidad del etiquetado.** El etiquetado de ocasiones es manual y su calidad decide la de las sugerencias. El vocabulario se valida en SCRUM-126:
  - cada ocasión en 2 o más categorías y en el 5–50 % de los comercios;
  - correlación menor a 0.7 con las demás;
  - 80 % de acuerdo entre dos etiquetadores.

  Cambiar el vocabulario requiere acuerdo del PO.
- **La siguiente carga sobrescribe la base.** Lo que se edite en Supabase o Midi sobre filas definidas en la fuente se sobrescribe con la siguiente carga generada. El catálogo se cambia en `catalogo/catalogo.json`.
- **La base no garantiza la forma completa.** Como las columnas nuevas son opcionales, esa garantía la dan el validador y las pruebas.
- **Decisiones de modelo pendientes** (comentario de revisión en SCRUM-123):
  - los ids heredados que no corresponden al comercio, como `restaurante` para McDonald's;
  - la categoría del comercio, que está en `comercios.categoria_id` y en `categoria_comercios`;
  - la etiqueta «regalo», fija en un `CHECK`.
- **Coordenadas sin verificar.** Las del esqueleto son aproximadas; la verificación en OpenStreetMap queda para H8.

## Reversibilidad

Se clasifica como puerta de una vía por el costo de cambio dentro del calendario académico, no por imposibilidad técnica.

- Cambiar el vector o las capas obliga a etiquetar de nuevo el catálogo y a adaptar el motor y las historias que lo leen.
- Mover la fuente única a la base sería más barato, porque la forma del contrato se conservaría, pero exigiría adaptar Midi y perder la revisión en PR.

## Evidencia y referencias

- «Algoritmo de promociones personalizadas · Beta» (18 de octubre de 2026), secciones «Datos del catálogo», «Similitud» y «Puntaje»; «Encuesta inicial · Bases de diseño (beta)».
- H24 en Jira ([SCRUM-115](https://somos-agilistas.atlassian.net/browse/SCRUM-115)), con su contrato y criterios de aceptación; Entrega 1 en [SCRUM-123](https://somos-agilistas.atlassian.net/browse/SCRUM-123).
- [PR #21](https://github.com/eandressrod/LosExtras-BancoAgricola/pull/21): `catalogo/esquema.json`, `catalogo/catalogo.json`, `scripts/catalogo/`, las migraciones `20261020203000_h24_catalogo_contrato.sql` y `20261020203100_h24_catalogo_esqueleto.sql`, y la sección 10 de `docs/GUIA_DESARROLLO.md`. Esas rutas existen en `main` después del merge.

Este registro documenta la decisión. No acredita el merge, la aprobación del PO ni el cumplimiento íntegro de la Definition of Done de H24.
