# Runbook — Preparar staging

Staging es el entorno de pruebas (ADR-038):

- base `inv-staging`;
- app en `https://staging.inv-web-326.pages.dev`;
- una vista previa por PR en `https://pr-<número>.inv-web-326.pages.dev`.

Solo tiene **datos ficticios**. Este runbook se hace **una vez**.

## Qué hace el CI solo

| Cuándo                     | Qué hace                                                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| En cada PR del repositorio | Construye la app contra staging, la publica en `pr-<número>` y comenta el enlace en el PR. La primera vez también crea el proyecto `inv-web` en Cloudflare |
| En cada merge a `main`     | Aplica las migraciones nuevas a `inv-staging` (nunca el seed) y publica `staging.inv-web-326.pages.dev`                                                    |

## Lo que haces tú, una vez

Hazlo después del primer merge a `main` con el workflow de staging: ese merge crea las tablas en `inv-staging`.

### 1. Cerrar el registro abierto

Supabase → proyecto `inv-staging` → Authentication → Sign In / Providers → Email: desactiva **Allow new users to sign up**. Así nadie puede crearse una cuenta desde la vista previa.

### 2. Crear los dos usuarios de prueba

Authentication → Users → **Add user** → **Create new user**, dos veces:

| Usuario       | Correo                                           | Contraseña                                          |
| ------------- | ------------------------------------------------ | --------------------------------------------------- |
| Administrador | Un alias tuyo, p. ej. `tucorreo+staging-admin@…` | Larga y única; guárdala en tu gestor de contraseñas |
| Vendedor      | Otro alias, p. ej. `tucorreo+staging-vendedor@…` | Otra distinta                                       |

Marca **Auto Confirm User**.

Nunca escribas estos correos ni contraseñas en el repositorio, en un PR o en un chat.

### 3. Crear el negocio y vincular a los usuarios

SQL Editor → nueva consulta.

1. Pega y ejecuta el contenido de `supabase/bootstrap/prod.sql`. Crea "Mi Negocio", los roles, las categorías y los métodos de pago.
2. Ejecuta lo siguiente, con los correos del paso 2 y nombres ficticios:

   ```sql
   select private.link_user('<correo del administrador>', 'admin', 'Admin de pruebas');
   select private.link_user('<correo del vendedor>', 'seller', 'Vendedor de pruebas');
   ```

3. Pega y ejecuta el contenido de `supabase/bootstrap/staging-demo.sql`. Carga 10 productos y 15 clientes ficticios.

### 4. Probar

Abre `https://staging.inv-web-326.pages.dev` en el celular y entra con el Administrador. La pantalla de entrada llega con el PR de sesión de la Etapa 2.

## Si algo sale mal

| Situación                           | Qué hacer                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| La vista previa no aparece en el PR | Revisa el job `preview` del workflow `staging`. Los PRs de forks y de Dependabot no reciben vista previa, a propósito |
| "No Auth user with email"           | El correo de `link_user` no coincide con el del paso 2                                                                |
| "Demo data already loaded"          | Los productos ya existen; no hace falta repetir el paso 3.3                                                           |
| Hay que empezar de cero             | Pide a Claude Code un plan; no se borra nada a mano (RN-12)                                                           |
