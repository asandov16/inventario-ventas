# ADR-039 — Pruebas E2E de cada PR contra Supabase local

- **Estado:** Aceptada
- **Fecha:** 2026-11-05
- **Origen:** Plan de la Etapa 2 (F3-T11)

## Contexto

ADR-024 define un negocio dedicado en staging para las pruebas E2E completas. Para cada PR hace falta algo más rápido, que no dependa de staging ni toque sus datos, y que funcione igual en la Mac y en CI.

## Decisión

- **Las pruebas `smoke` (Playwright) corren en cada PR** contra la versión de producción de la app (`vite build` + `vite preview`), conectada a **Supabase local** con el seed. Los usuarios `admin@test.local` y `vendedor@test.local` tienen una contraseña pública que solo existe en local y en CI (ADR-033).
- **Navegador:** Chromium con el viewport de un celular (Pixel 7).
  - En la Mac se usa el Chrome instalado; CI instala el Chromium de Playwright.
  - WebKit y los 15 casos de uso completos quedan para la corrida nocturna de la Etapa 3 (ADR-024).
- **Comandos:**
  - `pnpm test:e2e` construye la app y corre las pruebas;
  - antes, `pnpm db:reset` deja la base en un estado conocido.
- **El job `e2e` del CI** es parte del check requerido `ci`.

## Consecuencias

- Cada PR prueba la entrada, la navegación, los permisos y la instalación con datos reales del seed, sin secretos.
- Una prueba que registra ventas cambia el seed local. Por eso se reinicia la base antes de correrlas, igual que con `pnpm db:test`.
- El job tarda un par de minutos más que los demás, porque levanta Supabase.
