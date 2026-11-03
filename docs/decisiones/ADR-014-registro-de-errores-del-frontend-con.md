# ADR-014 — Registro de errores del frontend con Sentry

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-14

## Contexto

Hace falta saber cuándo algo falla en producción.

## Decisión

Sentry, plan gratuito. `beforeSend` elimina nombres, teléfonos y montos.

## Consecuencias

Se configura en la Etapa 4.
