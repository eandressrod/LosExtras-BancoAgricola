# ADR-012: Usar MapLibre GL JS con OpenFreeMap para el mapa de Cerca de ti

- Estado: propuesta. Investigación registrada en SCRUM-11 (comentario 10038), pendiente de la prueba en celulares reales y de la aprobación del PO.
- Fecha del registro: 25 de octubre de 2026.
- Fecha de la decisión: 25 de octubre de 2026.
- Decide: PO operativo (alcance) y equipo de desarrollo (forma técnica).
- Clasificación: puerta de dos vías.

## Contexto

H8 ([SCRUM-11](https://somos-agilistas.atlassian.net/browse/SCRUM-11)) pide un mapa de sucursales cercanas, distancia en el detalle, línea de recorrido aproximada y enlaces a Waze y a la app de mapas. La regla del proyecto exige una solución gratuita, sin registro ni claves, sin servicio de rutas y sin guardar la posición del usuario. La subtarea [SCRUM-50](https://somos-agilistas.atlassian.net/browse/SCRUM-50) investigó las opciones.

## Decisión

1. **Motor:** MapLibre GL JS 6.16.0 (BSD-3), servido desde `public/vendor/maplibre-gl@6.16.0/` (`maplibre-gl.mjs`, `maplibre-gl-worker.mjs` y `maplibre-gl.css`), sin bundler ni CDN. Se importa solo en Cerca de ti y en el detalle.
2. **Teselas:** OpenFreeMap, estilo `liberty`. Gratis, sin registro, claves ni cookies; la atribución la agrega MapLibre.
3. **Service worker:** no se modifica. Solo intercepta navegaciones del mismo origen, así que nunca guarda teselas.
4. **Ubicación:** API Geolocation del navegador. `getCurrentPosition` con tiempo límite de 10 s; cualquier error lleva al selector de zona. `watchPosition` solo con la pantalla visible.
5. **Recorrido:** polilínea esquemática dibujada con una capa GeoJSON en el navegador, sin servicio de rutas.
6. **Enlaces externos:** Waze (`waze.com/ul?ll=…&navigate=yes`) y Google Maps (`google.com/maps/dir/?api=1&destination=…`), solo con el destino.

## Alternativas consideradas

| Alternativa | Por qué no |
| --- | --- |
| Leaflet con teselas raster de OSM | Más liviano, pero la política de la OSMF no da SLA, puede bloquear sin aviso y prohíbe el uso sin conexión y la precarga. Queda solo como respaldo documentado. |
| Google Maps, Mapbox u otros con clave | Requieren registro y clave; contradicen la regla del proyecto. |
| Servicio de rutas para dibujar calles reales | Los gratuitos no garantizan su uso desde aplicaciones; la ruta se delega en Waze o la app de mapas. |
| Cargar MapLibre desde un CDN | Agrega un tercero y una versión no controlada; se prefiere servirlo desde el proyecto. |

## Consecuencias

**Positivas**

- Costo cero, sin registro ni claves, con la atribución resuelta por el motor.
- El resto de la app no carga el peso del mapa.
- La posición del usuario no sale del navegador.

**Negativas o pendientes**

- **Peso:** unos 363 KB de motor (brotli) y de 300 a 640 KB de teselas en la primera vista sobre San Salvador.
- **Sin SLA:** OpenFreeMap puede fallar o descontinuarse. Si falla, la lista sigue funcionando (CDA 10).
- **Requisito:** WebGL2.
- **Coordenadas:** varias sucursales del catálogo están desviadas entre 1 y 2 km. Hay que corregirlas en SCRUM-51 antes de conectar Waze.
- **Pendiente de verificar:** tiempos, gestos, permisos y comportamiento en la PWA en un Android y un iPhone reales.

## Reversibilidad

Es de dos vías: cambiar de proveedor de teselas es cambiar la URL del estilo, y cambiar de motor afecta solo a los módulos del mapa. No toca datos ni API.

## Evidencia y referencias

- Investigación: comentario 10038 en [SCRUM-11](https://somos-agilistas.atlassian.net/browse/SCRUM-11).
- [OpenFreeMap](https://openfreemap.org/) y sus [condiciones](https://openfreemap.org/tos/).
- [Política de teselas de la OSMF](https://operations.osmfoundation.org/policies/tiles/).
- [Deep links de Waze](https://developers.google.com/waze/deeplinks) y [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

Este registro documenta la decisión. No acredita la aprobación del PO, el merge ni la DoD de H8.
