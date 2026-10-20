# ADR-003: Persistir los datos en Supabase detrás de repositorios

- Estado: aceptada; registro retrospectivo de una decisión existente.
- Fecha del registro: 20 de octubre de 2026.
- Antecedentes: preparación autorizada el 7 de octubre y distribución de persistencia aceptada para la preparación del 8 de octubre de 2026.
- Clasificación: puerta de dos vías, con reversibilidad condicionada.

## Contexto

El catálogo es compartido y las preferencias y promociones guardadas pertenecen a cada usuario. El alcance inicial exclusivamente local fue sustituido por persistencia y validación de sesión en backend.

El PDF identifica `backend/repositorios/contrato.js` como un punto de coordinación importante. Los nombres y tipos de las promociones conectan adaptadores, API y pantallas: cambiar campos como `benefit` o `applicableCard` puede producir cambios en cadena.

## Decisión

Utilizar Supabase para la persistencia, accediendo desde el backend a través de repositorios. El navegador consume nuestra API; la configuración y la clave privada del proveedor permanecen en el backend.

Mantener los adaptadores mock y Supabase bajo contratos de aplicación compartidos. `DATA_SOURCE` selecciona explícitamente la fuente; una falla de Supabase no se sustituye automáticamente por datos mock.

Guardar el catálogo y las elecciones persistentes por usuario en la base. Mantener temporalmente en el navegador los filtros y el estado de navegación. Los recursos gráficos del producto viven en `public/`; el catálogo referencia sus rutas.

Las operaciones privadas deben validar sesión y propietario en backend. El uso de una clave privilegiada para consultar la base no acredita la identidad del visitante. La persistencia en Supabase no implica utilizar Supabase Auth: el código inspeccionado mantiene autenticación y sesión propias.

## Alternativas

El antecedente de almacenamiento local está documentado. Las restantes opciones se incluyen como comparación técnica, sin atribuirles una evaluación formal del equipo.

| Alternativa | Implicación |
| --- | --- |
| Solo datos locales o mock | No satisface la persistencia compartida y por usuario acordada después. Se conserva mock para desarrollo y pruebas. |
| Otro proveedor de persistencia | Requiere implementar adaptadores y trasladar datos y reglas de la base, manteniendo los contratos de aplicación. |
| Acceso directo desde las pantallas al proveedor | Extiende la dependencia del proveedor al frontend y cambia el modelo actual de autorización y acceso. |

## Consecuencias

- Centraliza el catálogo y permite conservar elecciones por usuario fuera de un navegador concreto.
- Separa la lógica de aplicación de las consultas concretas al proveedor y permite probar con adaptadores locales.
- Introduce dependencia de configuración, conectividad, esquema SQL y funciones de PostgreSQL.
- La separación es parcial: los adaptadores conocen tablas, relaciones y RPC como `estado_actividad_sesion`. Cambiar el proveedor exige revisar esas dependencias, no solo reemplazar una URL.
- El contrato JSDoc es documentación compartida, no una garantía automática de igualdad entre implementaciones.

## Reversibilidad

Se considera puerta de dos vías porque los consumidores pueden conservar los contratos de los repositorios y de la API. La salida exige exportar y migrar datos, adaptar consultas y funciones específicas, preservar identidad y propiedad y verificar el comportamiento de las operaciones afectadas. No se ha realizado una migración de proveedor que demuestre ese costo.

La propuesta del PDF de estabilizar campos y verificar la misma estructura entre adaptadores sigue siendo una orientación para trabajo futuro; este ADR no implementa cambios al contrato ni pruebas adicionales.

## Evidencia y referencias

- Documento aportado: *Decisiones de arquitectura*, página 1, tercera decisión y apartado 2; página 2, continuación sobre acoplamiento.
- Registros históricos consultados: «Base de Supabase preparada», 7 de octubre; «Recomendación de persistencia» y «Base Supabase y entorno TDD preparados», 8 de octubre de 2026. Su evidencia remota corresponde a esas fechas.
- [Contrato](../backend/repositorios/contrato.js), [selección de repositorios](../backend/repositorios/index.js), [adaptador mock](../backend/repositorios/mock.js) y [adaptador Supabase](../backend/repositorios/supabase.js).
- [Configuración privada del cliente](../backend/config/supabase.js) y [adaptador de accesos con RPC](../backend/repositorios/accesos.supabase.js).
- [Migraciones SQL](../supabase/migrations/) y [guía de desarrollo](../docs/GUIA_DESARROLLO.md).

No se consultó la base remota ni se aplicaron migraciones para redactar este registro.
