# ADR-032 — Permisos cerrados por defecto

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan de la Etapa 1, §4

## Contexto

Supabase otorga por omisión todos los privilegios sobre el esquema `public` a los roles de la API (`anon`, `authenticated`). Con RLS activada eso no expone filas, pero deja la puerta abierta a escrituras directas si alguna política se escribiera mal. La clave pública de la app es visible para cualquiera (ADR-020).

## Decisión

- Se revocan todos los privilegios de `anon` y `authenticated` en tablas, secuencias y funciones, también para objetos futuros (`alter default privileges`).
- `authenticated` recibe solo `SELECT`; RLS decide qué filas ve.
- No existen políticas de escritura: toda escritura pasa por funciones RPC `security definer` que verifican permisos.
- `anon` solo puede ejecutar `ping()`.

## Consecuencias

Cada vista o función nueva necesita su `grant` explícito. La prueba `00_schema.sql` falla si `authenticated` recibe un privilegio distinto de `SELECT` o si `anon` recibe cualquiera.
