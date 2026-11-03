# ADR-033 — Usuarios de prueba solo en el seed local

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan de la Etapa 1, §6

## Contexto

El roadmap pedía usar `seed.sql` en local y en staging. El seed contiene usuarios con una contraseña conocida y publicada en este repositorio público. Staging está en internet.

## Decisión

- `supabase/seed.sql` se usa solo en el Supabase local y en el CI. `supabase db push` no lo ejecuta.
- Staging y producción nunca reciben el seed. Sus usuarios se crean en la Etapa 4 desde el panel de Supabase, con contraseñas secretas, y se vinculan con `private.link_user`.
- Producción se inicia con `supabase/bootstrap/prod.sql`, sin usuarios ni marca.

## Consecuencias

Las pruebas E2E contra staging (Etapa 4) usan credenciales guardadas en los secretos del Environment `staging`.
