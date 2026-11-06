# ADR-038 — Vista previa por PR y staging desde `main`

- **Estado:** Aceptada
- **Fecha:** 2026-11-05
- **Origen:** Plan de la Etapa 2; adelanta parte de F8

## Contexto

El DoD de la Etapa 2 pide hacer una venta desde el celular con la app instalada. Instalar una PWA exige HTTPS, así que un servidor local en la red de la casa no sirve.

El roadmap dejaba los despliegues para F8 (Etapa 4). El proyecto `inv-web` de Cloudflare no se creó en la Etapa 0, porque `wrangler` no lo crea desde la raíz del workspace.

## Decisión

- **Workflow `staging`**, separado de `ci`:
  - **PRs del propio repositorio:** construye la app contra `inv-staging`, la publica en Cloudflare Pages como `pr-<número>.inv-web-326.pages.dev` y comenta el enlace en el PR. Los forks y Dependabot no reciben secretos ni vista previa. Nunca se usa `pull_request_target`.
  - **Merge a `main`:** `supabase db push` a `inv-staging`, nunca el seed (ADR-033), y publicación en `staging.inv-web-326.pages.dev`.
    - Los runners de GitHub no tienen IPv6, y la dirección directa de la base es solo IPv6. Por eso las migraciones pasan por el _pooler_ IPv4 del proyecto, en modo sesión (puerto 5432).
    - `scripts/supabase-pooler-url.sh` arma la dirección con la API de Supabase y la oculta en los logs.
- **El proyecto `inv-web`** lo crea el propio CI la primera vez, desde una carpeta temporal fuera del workspace. Su rama de producción es `production` y no se usa hasta la Etapa 4.
- **`wrangler`** corre con versión exacta (`npx wrangler@<versión>`), no como dependencia del proyecto, para no instalarlo en cada job.
- **Los datos de staging son ficticios:**
  - `bootstrap/prod.sql` crea el negocio;
  - `bootstrap/staging-demo.sql` carga productos y clientes;
  - dos usuarios con contraseñas que solo conoce el dueño, sin registro abierto.

  Pasos en `docs/runbooks/staging.md`.

## Consecuencias

- Cada PR trae un enlace que se puede abrir en el celular.
- La Etapa 4 hereda el camino de despliegue probado, y le queda solo producción: entorno con revisor, dominio y respaldos.
- La vista previa es pública en internet, pero solo tiene datos ficticios y pide sesión.
- Las vistas previas de PRs viejos quedan publicadas en Cloudflare; no exponen nada real.
