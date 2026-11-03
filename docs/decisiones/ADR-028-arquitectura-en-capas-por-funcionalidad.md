# ADR-028 — Arquitectura en capas por funcionalidad

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §5.2

## Contexto

Hace falta un patrón claro y verificable para que el código no se mezcle.

## Decisión

Vertical slices por funcionalidad + capas (presentación → aplicación → acceso a datos → gateway; dominio puro) + CQRS ligero (vistas para leer, RPC para escribir). Se verifica con `eslint-plugin-boundaries`.

## Consecuencias

Una importación que viola las capas hace fallar el CI.
