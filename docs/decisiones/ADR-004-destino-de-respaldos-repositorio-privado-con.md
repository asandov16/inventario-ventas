# ADR-004 — Destino de respaldos: repositorio privado con archivos cifrados

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-04

## Contexto

Supabase Free no incluye respaldos.

## Decisión

Repositorio privado `inventario-backups`. Cada respaldo es un archivo de _release_ cifrado con `age`. Retención de 30 días.

## Consecuencias

Sin costo ni tarjeta. Ampliada por ADR-021: los workflows de respaldo viven en ese repo.
