# ADR-020 — Repositorio público con controles de exposición

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §4 y §8

## Contexto

En repos privados, GitHub Free no ofrece Environments con secretos, aprobadores requeridos ni protección de ramas. El 3 nov 2026 se decidió un repo público, con especial cuidado.

## Decisión

Repositorio público `inventario-ventas`. Controles: gitleaks en pre-commit y CI, push protection, sin datos reales ni marca, respaldos en repo privado (ADR-021), workflows sin `pull_request_target`, Actions fijadas por SHA y Environment `production` con aprobación.

## Consecuencias

La seguridad depende de RLS y de los secretos, nunca de ocultar el código. Un secreto expuesto se rota; no basta con borrarlo.
