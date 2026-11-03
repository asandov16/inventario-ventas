# ADR-029 — Nombres de migraciones con timestamp

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §8

## Contexto

El roadmap usaba `0001_*`, que no es el formato de Supabase CLI.

## Decisión

Migraciones creadas con `supabase migration new <snake_case>`, que genera `<timestamp>_<nombre>.sql`.

## Consecuencias

Orden garantizado y compatible con `supabase db push`.
