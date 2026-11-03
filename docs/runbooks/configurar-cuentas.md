# Runbook: configurar cuentas y entornos (Etapa 0)

Pasos que hace la persona dueña del proyecto. Claude Code nunca escribe credenciales; los valores secretos se copian directo del panel al comando `gh secret set`, sin pasar por el chat ni por archivos.

**Antes de empezar:** activa la verificación en dos pasos en cada cuenta y guarda las claves en un gestor de contraseñas.

## 1. Herramientas locales

```bash
sudo xcodebuild -license accept      # desbloquea Homebrew en esta Mac
brew install gh gitleaks age
brew install --cask orbstack         # Docker para Supabase local (o Docker Desktop)
nvm install                          # lee .nvmrc (Node 24)
corepack enable
pnpm install
```

## 2. GitHub

1. Inicia sesión: `gh auth login` (GitHub.com, HTTPS, navegador).
2. Anota tu correo _noreply_ (GitHub → Settings → Emails → "Keep my email address private"). Los commits de un repo público usan ese correo, nunca el personal.
3. Crea los repositorios (lo hace Claude Code después de tu confirmación):
   - `inventario-ventas`, **público**: el código.
   - `inventario-backups`, **privado**: respaldos cifrados y sus workflows.
4. En `inventario-ventas` → Settings:
   - **Code security:** activar _Secret scanning_ y _Push protection_.
   - **Actions → General:** _Require approval for all external contributors_; permisos del `GITHUB_TOKEN` en solo lectura.
   - **Branches → Rulesets** para `main`: PR obligatorio, check `ci` en verde, sin force push, sin borrar, sin excepciones para administradores.
   - **Environments:** `staging` (sin aprobación) y `production` (aprobación requerida tuya; solo la rama `main` y tags `v*`).

## 3. Supabase

1. Crea la cuenta entrando con GitHub.
2. Crea dos proyectos en **us-east-1** (ADR-016): `inv-staging` e `inv-prod`. Guarda cada contraseña de base en el gestor.
3. En cada proyecto:
   - Authentication → Sign In / Providers → **desactivar** "Allow new users to sign up".
   - Authentication → Policies (contraseñas): mínimo **10** caracteres.
   - Authentication → URL Configuration: _Site URL_ del entorno (se completa en la Etapa 4).
   - Database → Extensions: habilitar `pg_trgm`, `unaccent`, `pg_cron`.
4. Account → Access Tokens → crea un token para CI.

## 4. Cloudflare

1. Crea la cuenta.
2. Workers & Pages → crea el proyecto Pages `inv-web` por **Direct Upload** (sin conectar Git).
3. My Profile → API Tokens → token con permisos solo para _Cloudflare Pages: Edit_ y _Workers Scripts: Edit_.
4. Anota el _Account ID_.

## 5. Secretos de GitHub

Se cargan por Environment. Escribe cada comando tú mismo; `gh` pide el valor sin mostrarlo.

```bash
# Repositorio (comunes)
gh secret set SUPABASE_ACCESS_TOKEN
gh secret set CLOUDFLARE_API_TOKEN
gh secret set CLOUDFLARE_ACCOUNT_ID

# Environment staging
gh secret set SUPABASE_PROJECT_REF   --env staging
gh secret set SUPABASE_DB_PASSWORD   --env staging
gh secret set VITE_SUPABASE_URL      --env staging
gh secret set VITE_SUPABASE_ANON_KEY --env staging

# Environment production
gh secret set SUPABASE_PROJECT_REF   --env production
gh secret set SUPABASE_DB_PASSWORD   --env production
gh secret set VITE_SUPABASE_URL      --env production
gh secret set VITE_SUPABASE_ANON_KEY --env production
```

Más adelante: credenciales E2E (Etapa 2) y `SENTRY_DSN` (Etapa 4). `PROD_DB_URL` y las claves de `age` van **solo** en `inventario-backups` (ADR-021).

## 6. Comprobación

- `gh auth status` muestra la sesión.
- `pnpm db:start` levanta Supabase local (requiere Docker).
- Un PR de prueba ejecuta el CI en verde en menos de 3 minutos.
- Un push directo a `main` es rechazado.
