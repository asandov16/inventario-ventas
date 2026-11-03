# ADR-013 — Estilos con CSS Modules y variables

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-13

## Contexto

El prototipo v2 define una paleta y componentes propios.

## Decisión

CSS Modules + variables portadas a `web/src/shared/styles/tokens.css`. Sin framework CSS.

## Consecuencias

Menos dependencias; los componentes usan solo variables.
