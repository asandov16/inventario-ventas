# ADR-026 — Node 24 LTS y TypeScript 6.0

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §8

## Contexto

D-15 fijaba Node 22, pero hay líneas LTS más nuevas. TypeScript 7 aún no es compatible con typescript-eslint, que exige TS < 6.1.

## Decisión

Node 24.22.2, fijado en `package.json` (`devEngines.runtime`) y `.nvmrc`. TypeScript 6.0.3. pnpm 12.

## Consecuencias

Revisar TypeScript 7 cuando typescript-eslint lo soporte; Dependabot lo propondrá.
