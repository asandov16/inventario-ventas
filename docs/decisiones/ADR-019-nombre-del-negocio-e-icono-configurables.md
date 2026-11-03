# ADR-019 — Nombre del negocio e ícono configurables

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-19

## Contexto

El nombre del negocio debe ser editable y el ícono cambiará.

## Decisión

El nombre vive en la base (Perfil → Negocio). El nombre de la app instalada sale de `VITE_APP_NAME`. Íconos provisionales en `web/public/icons/`.

## Consecuencias

Ningún archivo del repositorio contiene el nombre real del negocio; también es un control del repo público (ADR-020).
