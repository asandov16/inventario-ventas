# ADR-011 — Costo de cada línea de venta en tabla aparte

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-11

## Contexto

El Vendedor no debe ver costos.

## Decisión

Tabla `sale_item_costs`, legible solo con el permiso `costs.read`, igual que `product_costs`.

## Consecuencias

RLS por tabla; Playwright verifica que ningún costo llega al navegador del Vendedor.
