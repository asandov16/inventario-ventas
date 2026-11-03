# ADR-009 — Fecha de vencimiento de cuotas

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-09

## Contexto

El prototipo se desbordaba al mes siguiente (31 ene → 3 mar).

## Decisión

Cada cuota vence el mismo día del mes, contado desde la fecha de venta; si ese día no existe, el último día del mes (31 ene → 28 feb).

## Consecuencias

Probado con `shared/fixtures/installments.cases.json` en SQL y en TypeScript.
