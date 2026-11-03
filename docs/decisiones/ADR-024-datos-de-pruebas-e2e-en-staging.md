# ADR-024 — Datos de pruebas E2E en staging

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §8

## Contexto

F8-T04 borraba datos E2E, pero `prevent_delete` impide borrar.

## Decisión

Las pruebas E2E usan un negocio dedicado en staging. La limpieza es un script exclusivo de staging que desactiva triggers en su sesión; nunca existe en producción.

## Consecuencias

La regla "nada se borra" se mantiene intacta en producción.
