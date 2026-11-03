# ADR-021 — Workflows de respaldo solo en el repositorio privado

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §8

## Contexto

Los logs de Actions de un repo público son públicos.

## Decisión

`backup.yml` y `restore-test.yml` viven en `inventario-backups` (privado), junto con `PROD_DB_URL` y la clave privada de `age`.

## Consecuencias

El repo de código solo toca producción con `supabase db push` durante el release aprobado.
