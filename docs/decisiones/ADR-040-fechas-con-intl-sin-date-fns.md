# ADR-040 — Fechas con `Intl`, sin `date-fns`

- **Estado:** Aceptada
- **Fecha:** 2026-11-05
- **Origen:** Plan de la Etapa 2 (F3-T08)

## Contexto

El roadmap lista `date-fns` y `date-fns-tz` para las fechas. Lo que la app necesita es poco:

- el día de hoy en la zona del negocio;
- sumar meses con ajuste a fin de mes (ADR-009);
- formatos cortos como "2 dic";
- etiquetas como "Hoy", "Ayer" y "hace 5 min".

## Decisión

- `shared/domain/dates.ts` usa `Intl.DateTimeFormat` con `timeZone: 'America/Costa_Rica'` para saber el día en el negocio.
- Los vencimientos y fechas de calendario se manejan como texto `YYYY-MM-DD`, así nunca se corren por la zona horaria del navegador.
- Las abreviaturas de los meses ("ene"…"dic") están en `messages.es.ts`, para que el texto sea igual en todos los navegadores.
- No se agregan `date-fns` ni `date-fns-tz`.

## Consecuencias

- Una dependencia menos y un paquete de JavaScript más pequeño.
- `addMonths` reproduce el ajuste a fin de mes de Postgres, y lo prueban los mismos casos de cuotas que pgTAP (ADR-034).
- Si un día se necesitan cálculos de fechas más complejos, se revisa esta decisión.
