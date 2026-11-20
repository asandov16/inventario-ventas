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

### 0. Dirección del pooler (antes que todo)

Los runners de GitHub no tienen IPv6, así que las migraciones entran por el _pooler_ IPv4 de Supabase. Su dirección no es secreta, pero el CI necesita saberla:

1. Supabase → proyecto `inv-staging` → botón **Connect** → pestaña **Session pooler**.
2. Copia solo el host de la cadena de conexión: lo que va entre `@` y `:5432`. Por ejemplo, `aws-0-us-east-1.pooler.supabase.com`.
3. En la Terminal:

   ```bash
   gh variable set SUPABASE_POOLER_HOST --env staging --body "<host copiado>"
   ```

4. En GitHub → Actions → workflow `staging`, vuelve a correr la última ejecución de `main` (**Re-run jobs**). Debe quedar en verde: así se crean las tablas en `inv-staging`.

Los pasos siguientes se hacen después de esa ejecución en verde.

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

3. Pega y ejecuta el contenido de `supabase/bootstrap/staging-demo.sql`. Carga 10 productos y 15 clientes ficticios, con teléfonos `1230-NNNN`.

### 4. Probar

Abre `https://staging.inv-web-326.pages.dev` en el celular y entra con el Administrador.

**Teléfonos al probar:** usa siempre números que empiecen con **1230** (por ejemplo `1230-0050`). Ninguna línea de Costa Rica empieza con 1, así que un recordatorio por WhatsApp nunca le llega a una persona real. Nunca pruebes con un número de verdad, ni siquiera el tuyo.

## Pasar los teléfonos de staging al rango ficticio (una vez, 20 nov 2026)

Los datos de staging se cargaron con teléfonos `8000-NNNN`, que pueden ser de personas reales. Para cambiarlos todos:

1. Supabase → proyecto **`inv-staging`** (revisa el nombre arriba a la izquierda; **nunca** en `inv-main`) → SQL Editor → nueva consulta.
2. Pega y ejecuta el contenido de `supabase/bootstrap/staging-fictional-phones.sql`.
3. La tabla del final debe mostrar `customers` igual a `customers_fictional` y `reminders` igual a `reminders_fictional`.

Qué cambia:

- Los clientes de prueba conservan sus 4 últimos dígitos: `8000-0003` pasa a `1230-0003`.
- Cualquier otro número que se haya escrito al probar pasa a `1239-NNNN`.
- Los teléfonos del personal, si hay, pasan a `1238-NNNN`.
- El registro de recordatorios sigue el número nuevo de su cliente.

El script se niega a correr si no encuentra el catálogo ficticio de prueba, así que no hace nada en producción. Corre todo o nada.

## Si algo sale mal

| Situación                           | Qué hacer                                                                                                             |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| La vista previa no aparece en el PR | Revisa el job `preview` del workflow `staging`. Los PRs de forks y de Dependabot no reciben vista previa, a propósito |
| "No Auth user with email"           | El correo de `link_user` no coincide con el del paso 2                                                                |
| "Demo data already loaded"          | Los productos ya existen; no hace falta repetir el paso 3.3                                                           |
| Hay que empezar de cero             | Pide a Claude Code un plan; no se borra nada a mano (RN-12)                                                           |
