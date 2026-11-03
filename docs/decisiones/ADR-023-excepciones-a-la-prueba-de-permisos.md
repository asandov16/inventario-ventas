# ADR-023 — Excepciones a la prueba de permisos de RPC

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §8

## Contexto

La prueba de catálogo exige `require_permission` en toda función pública y se revoca `anon`. El keep-alive necesita `ping()` sin sesión.

## Decisión

Lista explícita de excepciones: `ping()` (ejecutable por `anon`, no lee datos) y `get_my_profile()` (solo el propio usuario).

## Consecuencias

Agregar una excepción exige un ADR nuevo.
