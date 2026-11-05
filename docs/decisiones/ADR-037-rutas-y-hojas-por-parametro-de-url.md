# ADR-037 — Rutas por sección y hojas por parámetro de URL

- **Estado:** Aceptada
- **Fecha:** 2026-11-05
- **Origen:** Plan de la Etapa 2 (F3-T02, F3-T04)

## Contexto

El prototipo v2 cambia de sección con `#dash`, `#sell`… y abre las hojas sin tocar la URL. En la app real:

- un enlace debe abrir la sección correcta;
- el botón Atrás del celular debe cerrar una hoja, en lugar de salir de la app;
- deslizar entre secciones no debe llenar el historial.

## Decisión

- **Rutas reales en español** con `react-router`: `/`, `/vender`, `/historial`, `/por-cobrar`, `/inventario`, `/perfil`.
- **Un solo componente para todas las rutas:** las seis secciones viven lado a lado en el `Track` (scroll-snap), y la ruta solo dice cuál está a la vista.
  - Cuando la ruta cambia, el `Track` se desplaza.
  - Cuando un deslizamiento se detiene en otro panel, la ruta cambia.
- **Cambiar de sección reemplaza la entrada del historial** (`replace`), tanto al deslizar como al tocar una pestaña. Atrás no recorre las secciones visitadas.
- **Las hojas se abren por parámetro** (`?venta=<id>`, `?cliente=<id>`, `?producto=<id>`) con `useUrlSheet`:
  - abrir agrega una entrada al historial, así que Atrás la cierra;
  - si la página se cargó con el parámetro, cerrar solo lo quita.

## Consecuencias

- Se puede compartir o recargar un enlace a una venta abierta.
- Las secciones que no están a la vista siguen montadas, para que el deslizamiento se vea fluido, pero quedan `inert`: sin foco y sin lector de pantalla.
- Las flechas del teclado cambian de sección en escritorio, salvo dentro de un campo o con una hoja abierta.
- El servidor debe devolver `index.html` para toda ruta. Cloudflare Pages lo hace por defecto para las SPA.
