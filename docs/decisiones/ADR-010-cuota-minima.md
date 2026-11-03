# ADR-010 — Cuota mínima

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-10

## Contexto

El redondeo a ₡100 puede dejar cuotas en ₡0 con saldos pequeños.

## Decisión

Si alguna cuota queda en ₡0, el plan se rechaza con `term_too_long` ("Con este saldo, elige menos meses").

## Consecuencias

Caso incluido en la tabla compartida de cuotas.
