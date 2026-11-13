# Runbook — Proyecto de Supabase pausado o por pausarse

Supabase Free pausa un proyecto después de 7 días sin actividad. El Worker `inv-keepalive` lo evita (ADR-042). Este runbook cubre la configuración inicial y qué hacer si llega un aviso.

| Proyecto   | Nombre en Supabase | ID                     |
| ---------- | ------------------ | ---------------------- |
| Staging    | `inv-staging`      | `fgcbwbmgdmfppxpabvlk` |
| Producción | `inv-main`         | `tkutayzwgalkavwwurvg` |

## Configuración inicial (una vez)

1. Supabase → `inv-main` → **Project Settings → API**. Copia:
   - la **Project URL** (`https://tkutayzwgalkavwwurvg.supabase.co`);
   - la llave **anon / publishable**, la pública. **Nunca** la `service_role` ni la `secret`.
2. En la Terminal, desde la carpeta del proyecto:

   ```bash
   gh variable set PROD_SUPABASE_URL --body "https://tkutayzwgalkavwwurvg.supabase.co"
   gh variable set PROD_SUPABASE_ANON_KEY
   ```

   El segundo comando pide el valor sin mostrarlo: pega la llave pública y Enter.

3. GitHub → Actions → workflow **keepalive** → **Run workflow** en `main`. Debe quedar en verde, con `keepalive staging: 200 via rpc` y `keepalive prod: 200 via graphql`.

## Si llega un aviso de pausa

1. Revisa la última ejecución del workflow `keepalive` y los logs del Worker (Cloudflare → Workers → `inv-keepalive` → Logs).
2. Arreglo inmediato: SQL Editor del proyecto → `select now();`. Reinicia el contador de 7 días.
3. Si ya está pausado: en el panel, **Restore project**. Hay 90 días para hacerlo.
4. Después, corre el workflow `keepalive` a mano y confirma que queda en verde.
