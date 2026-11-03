# ADR-025 — Unicidad sin distinguir mayúsculas mediante índices

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §8

## Contexto

`UNIQUE(business_id, lower(name))` no es válido como restricción de tabla.

## Decisión

Índices únicos por expresión, por ejemplo `CREATE UNIQUE INDEX ... ON categories (business_id, lower(name))`.

## Consecuencias

Mismo efecto; el error se traduce igual en `errors.ts`.
