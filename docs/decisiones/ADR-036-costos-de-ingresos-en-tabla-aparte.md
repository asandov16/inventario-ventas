# ADR-036 — Costos de ingresos de stock en tabla aparte

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Revisión del modelo en la Etapa 1

## Contexto

El roadmap guardaba `unit_cost` dentro de `inventory_movements`. El Vendedor puede leer esa tabla (`inventory.read`) para ver los movimientos de stock, así que vería el costo de cada ingreso. Eso contradice "el Vendedor no ve costos" (matriz 2.2 y D-11).

## Decisión

El costo de cada ingreso va en `inventory_movement_costs` (1:1 con el movimiento), legible solo con `costs.read`. Es el mismo patrón que `product_costs` y `sale_item_costs`.

## Consecuencias

El modelo tiene 20 tablas en lugar de 19. La lista "Últimos ingresos" del Administrador une ambas tablas; la del Vendedor no muestra costos. Lo verifica `10_rls.sql`.
