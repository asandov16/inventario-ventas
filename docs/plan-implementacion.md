# Plan de implementación — Sistema de Inventario y Ventas

## 1. Contexto

Hay requerimientos funcionales (rev. 17), requerimientos técnicos (v1), un roadmap (F0–F10) y el prototipo v2, pero todavía no hay código. Este plan agrupa las 11 fases del roadmap en **5 etapas hasta la beta y 1 después**. Cada etapa termina con una revisión tuya, y la siguiente no empieza sin tu visto bueno.

**Decisiones ya tomadas**

| Tema         | Decisión                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------- |
| Ubicación    | Repositorio nuevo en `workspace/inventario-ventas/`; las demás carpetas de `workspace/` no se tocan              |
| GitHub       | Repositorio **público**, plan Free, con los controles de la sección 4                                            |
| Idioma       | Español: documentos e interfaz. Inglés: código, comentarios, commits y PRs                                       |
| Arquitectura | La de los documentos: PWA estática en React + Cloudflare Pages + Supabase, con las reglas de negocio en Postgres |
| `CLAUDE.md`  | En inglés, porque es configuración de ingeniería                                                                 |

**Al aprobar este plan se ejecuta solo la parte local de la Etapa 0** (sección 7). Después paro y te paso los pasos de creación de cuentas.

## 2. Etapas

```
 Etapa 0        Etapa 1          Etapa 2         Etapa 3            Etapa 4              Etapa 5
 Fundaciones -> Núcleo de     -> App y        -> Operación      -> Producción y      -> Sin conexión
                datos            Vender          diaria             beta                 (post-beta)
 F0             F1 + F2          F3 + F4         F6 + F5 + F7       F8 + F9              F10
    |              |                |               |                  |                    |
    v              v                v               v                  v                    v
 Repo, cuentas, El negocio se    Primera venta   Los 15 casos       v0.9.0-beta con      Feria simulada
 CI en verde    opera solo por   real desde el   de uso de punta    datos reales         sincroniza sin
                RPC, con pruebas celular         a punta            y respaldos          duplicados

 F8 (respaldos y despliegue) empieza al final de la Etapa 3: exige 7 noches seguidas
 de respaldos antes de cargar datos reales.
```

| Etapa                   | Alcance                                                                                      | Se revisa contigo                           | Criterio de terminado                                                                                        |
| ----------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **0 Fundaciones**       | F0: repo, herramientas, cuentas, CI                                                          | Repo y `CLAUDE.md`; entornos creados        | `pnpm dev` levanta todo; un PR de prueba pasa el CI en menos de 3 min                                        |
| **1 Núcleo de datos**   | F1: 19 tablas, RLS, roles. F2: RPC, vistas, concurrencia                                     | Reporte de pruebas y demostración de reglas | pgTAP cubre RN-01 a RN-18 con caso feliz y de rechazo; concurrencia en verde; prueba de catálogo de permisos |
| **2 App y Vender**      | F3: PWA, 6 secciones, sesión, respuestas. F4: CU-01 a CU-03                                  | Probar una venta en tu celular              | Venta en menos de 1 min; imposible guardar sin cliente; app instalable                                       |
| **3 Operación diaria**  | F6: CU-08 a CU-11. F5: CU-04 a CU-07. F7: CU-12 a CU-15 parcial, Realtime, saldos anteriores | Recorrido completo como Admin y Vendedor    | E2E de los 15 casos en Chromium y WebKit; ningún costo llega al navegador del Vendedor                       |
| **4 Producción y beta** | F8: despliegues, respaldos, monitoreo. F9: datos reales, prueba con la familia               | Cuadre del cuaderno; lanzamiento            | Criterios de lanzamiento de F9: 7 respaldos, 1 restauración, 48 h sin errores nuevos                         |
| **5 Sin conexión**      | F10, cuando la beta esté estable                                                             | Reglas de conflicto antes de empezar        | Jornada simulada: 20 ventas, 5 abonos y 3 clientes en 2 celulares, sin duplicados                            |

**Avance:** etapas 0 y 1 completas el 3 nov 2026. El estado al día está en [`docs/avance.md`](avance.md).

Dentro de cada etapa se sigue el método del roadmap: plan primero, una rama por grupo de 2–4 tareas, pruebas antes del código y el avance marcado en `docs/roadmap.md`.

## 3. Pasos de configuración

### 3.1 Cuentas (las creas tú; yo no ingreso credenciales)

Activa 2FA en todas y guarda las claves en un gestor de contraseñas.

| #   | Servicio        | Cuándo             | Qué hacer                                                                                                                                                               | Qué resulta                                     |
| --- | --------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 1   | GitHub          | Etapa 0            | Usar o crear la cuenta; verificar 2FA                                                                                                                                   | Dueño de los repos                              |
| 2   | Supabase        | Etapa 0            | Entrar con GitHub; crear `inv-staging` e `inv-prod` en us-east-1; desactivar el registro público; contraseña mínima de 10; extensiones `pg_trgm`, `unaccent`, `pg_cron` | Project refs, contraseñas de base, access token |
| 3   | Cloudflare      | Etapa 0            | Crear cuenta; proyecto Pages `inv-web` por direct upload; token limitado a Pages y Workers                                                                              | Account ID, API token                           |
| 4   | Sentry          | Etapa 4            | Plan gratuito; proyecto React                                                                                                                                           | DSN                                             |
| 5   | Meta / WhatsApp | Después de la beta | No hace falta: la beta usa enlaces `wa.me`                                                                                                                              | —                                               |

### 3.2 Herramientas locales

Hoy hay Node 18, git y Homebrew. Faltan `gh`, pnpm, Docker y Supabase CLI.

```bash
brew install gh supabase/tap/supabase age gitleaks pipx
pipx install sqlfluff
nvm install 24 && corepack enable && corepack prepare pnpm@latest --activate
brew install --cask orbstack   # Docker para Supabase local; también sirve Docker Desktop
gh auth login                  # interactivo: lo corres tú con `! gh auth login`
```

### 3.3 Repositorios

1. `git init -b main` en `workspace/inventario-ventas/`.
2. Crear `inventario-ventas` (público) e `inventario-backups` (privado) con `gh repo create`. Este paso publica el código, así que lo confirmo contigo.
3. Proteger `main`: PR obligatorio, CI en verde, sin force push, reglas también para administradores.
4. Crear los Environments `staging` y `production`; este último con aprobación manual.
5. Activar secret scanning, push protection y Dependabot.
6. Cargar los secretos con `gh secret set --env ...`. **Los escribes tú; nunca pasan por el chat ni por archivos del repo.**

## 4. Controles por ser repositorio público

Quien lea el código sabrá exactamente cómo funciona el sistema. La seguridad depende de RLS y de los secretos, no de que el código esté oculto.

| Riesgo                                 | Control                                                                                                                                                            |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Subir un secreto por error             | `gitleaks` en pre-commit y en CI, push protection, `.env*` ignorado y solo `.env.example` versionado                                                               |
| Datos reales de clientes o del negocio | Regla absoluta: datos reales nunca en el repo. La semilla usa datos ficticios, y teléfonos y correos de prueba                                                     |
| Identidad del negocio expuesta         | Nombres genéricos (`inv-*`). Los documentos se copian a `docs/` sin marca y el prototipo con nombre ficticio. Los datos de contacto o de operación no se versionan |
| Respaldos o logs filtrados             | `backup.yml` y `restore-test.yml` viven **solo** en el repo privado, junto con `PROD_DB_URL`, porque los logs de Actions de un repo público son públicos           |
| PRs de forks que roben secretos        | Prohibido `pull_request_target`; aprobación obligatoria para workflows de colaboradores externos; vistas previas solo para ramas del propio repo                   |
| Actions de terceros comprometidas      | Versiones fijadas por SHA, `permissions: read-all` por defecto y Dependabot para actualizarlas                                                                     |
| Clave pública de Supabase visible      | Es esperado. Por eso: toda tabla con RLS, sin escrituras directas, y prueba de catálogo que falla si una RPC no verifica permisos                                  |
| Clave de servicio en el frontend       | Búsqueda en CI sobre el bundle; solo existe en secretos de Environments                                                                                            |
| Sentry con datos personales            | `beforeSend` elimina nombres, teléfonos y montos                                                                                                                   |

Además, cada PR pasa una revisión de exposición (secretos, datos reales, marca), y antes de cada release se corre `gitleaks` sobre todo el historial. Un secreto que llegue a un commit se considera comprometido: se rota, no basta con borrarlo.

## 5. Diseño de la estructura

### 5.1 Vista del sistema

```
                     +--------------------------------------+
  Celular / PC  ---> |  PWA estática (React + TS + Vite)    |
                     |  Cloudflare Pages + CDN              |
                     +------------------+-------------------+
                                        | HTTPS (clave pública + JWT)
                                        v
         +--------------------------------------------------------------+
         | SUPABASE                                                     |
         |  Auth    PostgREST (RPC / vistas)    Realtime    Edge Fns    |
         |    |             |                      |        (futuro)    |
         |    v             v                      v                    |
         |  +--------------------------------------------------------+  |
         |  | PostgreSQL: autoridad de reglas, permisos y datos      |  |
         |  +--------------------------------------------------------+  |
         +-------^----------------^-----------------------^-------------+
                 | migraciones    | ping cada 6 h         | pg_dump cada noche
    +------------+-----------+  +-+----------------+  +---+-------------------+
    | GitHub (público)       |  | Cloudflare Worker|  | GitHub (privado)      |
    | código, CI, despliegue |  | keep-alive       |  | respaldos cifrados    |
    +------------------------+  +------------------+  | prueba de restauración|
                                                      +-----------------------+
```

### 5.2 Patrón de diseño: capas por funcionalidad

El patrón combina cuatro ideas:

- **Vertical slices:** el código se organiza por funcionalidad, no por tipo de archivo.
- **Arquitectura en capas:** las dependencias van en un solo sentido.
- **CQRS ligero:** las lecturas pasan por vistas y las escrituras por RPC.
- **Repository + Gateway:** una sola puerta de salida hacia la base. Esto permite poner la cola de F10 sin tocar pantallas.

```
 FRONTEND (web/src)                                   Las dependencias solo bajan
 +--------------------------------------------------------------------------+
 | PRESENTACIÓN   features/*/components, pages · shared/ui                  |
 |                Muestra y captura. Sin reglas ni llamadas a la red.       |
 +-----------------------------------+--------------------------------------+
                                     v
 +--------------------------------------------------------------------------+
 | APLICACIÓN     features/*/hooks  (useRegisterSale, useSalesList)          |
 |                Orquesta casos de uso, caché y mensajes de respuesta.     |
 +-----------------+-----------------------------------+--------------------+
                   v                                   v
 +---------------------------------+   +------------------------------------+
 | DOMINIO  features/*/domain      |   | ACCESO A DATOS  features/*/api     |
 |          shared/domain          |<--| Repositorios + esquemas Zod        |
 | Funciones puras: cuotas,        |   | Traduce filas a modelos de dominio |
 | dinero, teléfono. Sin React ni  |   +-----------------+------------------+
 | red.                            |                     v
 +---------------------------------+   +------------------------------------+
                                       | GATEWAY  shared/api                |
                                       | rpcClient, useRpcMutation,         |
                                       | idempotencia, mapeo de errores     |
                                       | Único que importa supabase-js      |
                                       +-----------------+------------------+
 ========================================================|====== HTTPS =======
 BASE DE DATOS (supabase/migrations)                     v
 +--------------------------------------------------------------------------+
 | API PÚBLICA    public: RPC de comandos y lecturas · vistas v_*            |
 |                Primera línea de cada RPC: private.require_permission()   |
 +-----------------------------------+--------------------------------------+
                                     v
 +--------------------------------------------------------------------------+
 | DOMINIO SQL    private: calc_installments, has_permission, triggers       |
 +-----------------------------------+--------------------------------------+
                                     v
 +--------------------------------------------------------------------------+
 | DATOS          19 tablas · CHECK / UNIQUE · RLS · nada se borra           |
 +--------------------------------------------------------------------------+
```

**Reglas entre capas (las verifica `eslint-plugin-boundaries` en CI)**

| Regla                 | Detalle                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| Una dirección         | Una capa solo importa de las de abajo; dominio no importa de ninguna otra                                       |
| Red                   | Solo `shared/api` importa `supabase-js`                                                                         |
| Entre funcionalidades | Solo a través del `index.ts` público de cada una                                                                |
| Componentes           | No llaman repositorios: usan hooks                                                                              |
| Autoridad             | El frontend nunca decide reglas. Cuotas en TS son solo vista previa; siempre se muestra lo que devuelve la base |
| Sin servidor propio   | Cada acción es una RPC y una transacción                                                                        |

### 5.3 Flujo de una venta

```
 Sale form    useRegisterSale   salesRepository   useRpcMutation          register_sale()
    | toca Registrar |                |                 |                         |
    |--------------->| valida (Zod)   |                 |                         |
    |                |--------------->|---------------->| key = randomUUID()      |
    |  botón ocupado |                |                 |------------------------>| permiso, replay,
    |                |                |                 |                         | stock, total,
    |                |                |                 |                         | folio, cuotas
    |                |                |                 |<----- {status, sale} ---|
    |<------ toast ok / diálogo de duplicado / error con Reintentar (misma key) --|
    |                | invalida caché; Realtime avisa a los demás dispositivos    |
```

### 5.4 Estructura del repositorio

```
inventario-ventas/
├─ CLAUDE.md                  Reglas del proyecto (inglés)
├─ README.md                  Cómo levantar el proyecto (español)
├─ docs/                      Todo en español, sin marca
│  ├─ plan-implementacion.md  Este plan
│  ├─ roadmap.md · requerimientos-funcionales.md · requerimientos-tecnicos.md
│  ├─ glosario.md             Término de negocio <-> nombre en código
│  ├─ decisiones/             ADR-001-*.md …
│  ├─ runbooks/               release, rollback, restaurar-respaldo, crear-usuario…
│  └─ prototipo/v2.html       Referencia visual y de comportamiento
├─ supabase/
│  ├─ migrations/             <timestamp>_<snake_case>.sql, solo hacia adelante
│  ├─ tests/                  pgTAP: 00_schema, 10_rls, 20_register_sale…
│  ├─ functions/ · bootstrap/prod.sql · seed.sql · config.toml
├─ web/src/
│  ├─ app/                    router, providers, Track, TabBar, AuthGate
│  ├─ features/
│  │  ├─ dashboard/ sales/ history/ receivables/ inventory/ profile/ customers/
│  │  └─ sales/               Ejemplo de la forma común:
│  │     ├─ components/       SaleCheckoutSheet.tsx + .module.css
│  │     ├─ hooks/            useRegisterSale.ts
│  │     ├─ domain/           cart.ts + cart.test.ts
│  │     ├─ api/              salesRepository.ts, sales.schemas.ts
│  │     ├─ messages.es.ts    Textos en español de la interfaz
│  │     └─ index.ts          API pública de la funcionalidad
│  └─ shared/
│     ├─ api/                 supabaseClient, useRpcMutation, errors, database.types
│     ├─ domain/              money, phone, dates, installments, whatsapp
│     ├─ ui/                  Button, BusyButton, Sheet, Dialog, Toast, Banner…
│     ├─ hooks/ · styles/tokens.css
├─ shared/fixtures/           installments.cases.json (Vitest + pgTAP)
├─ e2e/{smoke,full}/          Playwright
├─ workers/keepalive/         Cloudflare Worker
├─ scripts/
└─ .github/workflows/         ci, deploy-staging, release, nightly, health
```

Respaldos y restauración van en el repo privado `inventario-backups`.

### 5.5 Del prototipo a la app

| Prototipo v2                                    | Destino                                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Variables CSS y componentes visuales            | `shared/styles/tokens.css`, `shared/ui/*` con CSS Modules                                                  |
| `buildPlan`                                     | `private.calc_installments` (autoridad) y `shared/domain/installments.ts` (vista previa), corrigiendo D-09 |
| `acct`                                          | Vistas `v_sale_accounts` y `v_installment_status`                                                          |
| `toast`, `bannerHTML`, `ferr`, `busy`, `dialog` | Toast, Banner, FieldError, BusyButton, Dialog                                                              |
| `S` en localStorage                             | Eliminado: los datos viven en Postgres y se leen con TanStack Query                                        |
| `switchUser`                                    | Sesión real con Supabase Auth                                                                              |
| Gráficos SVG                                    | Se portan como componentes en `features/dashboard`                                                         |

## 6. Convenciones

### 6.1 Idioma: ajuste al roadmap

El roadmap usa nombres en español (`registrar_venta`, `stock_insuficiente`, `features/vender`). Por tu regla **se traducen al inglés**, y `docs/glosario.md` mantiene la equivalencia.

| Tipo              | Roadmap                                     | Código                                                 |
| ----------------- | ------------------------------------------- | ------------------------------------------------------ |
| RPC de venta      | `registrar_venta`, `anular_venta`           | `register_sale`, `void_sale`                           |
| RPC de cobro      | `registrar_abono`, `registrar_recordatorio` | `register_payment`, `record_reminder`                  |
| RPC de inventario | `crear_producto`, `ingresar_stock`          | `create_product`, `restock_product`                    |
| Otras RPC         | `registrar_saldo_anterior`, `mi_perfil`     | `register_legacy_balance`, `get_my_profile`            |
| Cálculo           | `calc_cuotas`                               | `calc_installments`                                    |
| Errores           | `stock_insuficiente`, `abono_mayor_saldo`   | `insufficient_stock`, `payment_exceeds_balance`        |
| Permisos          | `ventas.registrar`, `costos.ver`            | `sales.create`, `costs.read`                           |
| Valores           | `contado`/`pagos`, `prima`, `migracion`     | `cash`/`installments`, `down_payment`, `legacy_import` |
| Carpetas          | `inicio`, `vender`, `cobros`                | `dashboard`, `sales`, `receivables`                    |

**Se quedan en español** porque las ve la persona: textos de interfaz, rutas (`/vender`, `/por-cobrar`), parámetros de URL (`?venta=`) y datos de catálogo ("Efectivo", "Perfumes"). `activity_log` guarda tipo y datos; el texto se arma en la interfaz.

### 6.2 Nombres

| Elemento                   | Estilo                                                          | Ejemplo                            |
| -------------------------- | --------------------------------------------------------------- | ---------------------------------- |
| Tablas                     | `snake_case` plural                                             | `sale_items`                       |
| Columnas                   | `snake_case`; `_at` fecha-hora, `_date` fecha, `_id` referencia | `voided_at`, `due_date`            |
| Funciones SQL y parámetros | `verbo_objeto`; prefijo `p_`                                    | `register_sale(p_customer_id)`     |
| Vistas                     | prefijo `v_`                                                    | `v_sale_accounts`                  |
| Índices y triggers         | `idx_<tabla>_<cols>`, `trg_<tabla>_<acción>`                    | `idx_sales_customer_id`            |
| Componentes React          | `PascalCase.tsx`                                                | `CustomerPicker.tsx`               |
| Hooks                      | `useCamelCase.ts`                                               | `useSalesList.ts`                  |
| Módulos y funciones        | `camelCase`                                                     | `formatMoney`                      |
| Constantes                 | `UPPER_SNAKE_CASE`                                              | `DUPLICATE_WINDOW_MINUTES`         |
| Tipos                      | `PascalCase`, sin prefijo `I`                                   | `SaleAccount`                      |
| Booleanos                  | `is`/`has`/`can`                                                | `isVoided`                         |
| Dinero                     | Entero con unidad clara                                         | `totalColones`                     |
| Pruebas                    | `*.test.ts`, `*.spec.ts`, `NN_tema.sql`                         | `installments.test.ts`             |
| Ramas                      | `<tipo>/stage-<n>-<tema>`                                       | `feat/stage-2-sales-checkout`      |
| Commits                    | Conventional Commits                                            | `feat(sales): add customer picker` |
| Versiones                  | SemVer con tag                                                  | `v0.9.0-beta`                      |
| ADR y runbooks             | Español, `kebab-case`                                           | `ADR-005-node-24.md`               |

### 6.3 Heurísticas

| Área        | Regla                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| Interfaz    | Revisión contra las 10 heurísticas de Nielsen más RF-UX-01 a 14, sección 4.1 y WCAG 2.1 AA en contraste y foco |
| Código      | Funciones con un solo propósito; extraer al tercer uso, no antes; sin `any`; TypeScript strict                 |
| Comentarios | Explican el porqué, no el qué; siempre en inglés                                                               |
| Datos       | Validar en la frontera con Zod; estados imposibles deben ser imposibles por tipos y `CHECK`                    |
| PRs         | Pequeños, de una sola tarea; sin cambios fuera de alcance                                                      |
| Pruebas     | Pruebas primero en reglas; pirámide: muchas unitarias y pgTAP, pocas E2E                                       |

### 6.4 Contenido de `CLAUDE.md`

1. Qué es el sistema y enlaces a `docs/`.
2. Regla de idioma y glosario.
3. Comandos: `pnpm dev`, `pnpm check`, `supabase start`, `supabase db reset`, `supabase test db`, `pnpm gen:types`, `pnpm e2e:smoke`.
4. Reglas de capas de la sección 5.2.
5. Reglas no negociables: la base es la autoridad, escrituras solo por RPC, migraciones solo hacia adelante, dinero en enteros, nada se borra, RLS con pgTAP en cada tabla, RN-17, preparación sin conexión.
6. Lista para crear una RPC: `SECURITY DEFINER`, `search_path = ''`, `require_permission`, REVOKE/GRANT, pgTAP y código de error en `errors.ts`.
7. **Reglas de repositorio público** (sección 4), marcadas como críticas.
8. Convenciones de nombres, flujo de trabajo por etapa y marcar el avance en el roadmap.

## 7. Etapa 0 en detalle

**Al aprobar (lo hago yo, solo local)**

1. Crear `workspace/inventario-ventas/` e iniciar git.
2. Escribir `CLAUDE.md`, `README.md`, `.gitignore`, `.env.example`, `.editorconfig`, `.nvmrc`.
3. Crear `docs/`: este plan, documentos fuente sin marca, glosario, prototipo y un ADR por decisión, incluidas las correcciones de la sección 8.
4. Crear el pnpm workspace (`web`, `e2e`, `workers/keepalive`, `scripts`), TS strict, ESLint flat con reglas de capas, Prettier, `.sqlfluff` y hook de `gitleaks`.
5. Crear el frontend vacío y un primer `installments.cases.json`.
6. Escribir `ci.yml` con filtros por ruta, `static`, `unit` y `gitleaks`.
7. Instalar herramientas locales con Homebrew y nvm, y correr `pnpm check`.

Si Docker o `gh` necesitan un paso interactivo, te lo indico y sigo con el resto. Hago commits locales, pero **no publico nada** hasta completar el siguiente bloque.

**Después (lo haces tú, con mi guía)**

8. Crear las cuentas de la sección 3.1 y correr `gh auth login`.
9. Confirmar la publicación del repo. Yo reviso el historial con `gitleaks`, publico y configuro protecciones (3.3).
10. Cargar secretos con `gh secret set`.
11. PR de prueba para cumplir el criterio de terminado.

## 8. Correcciones a los documentos

Encontré estos problemas al revisar los documentos. Cada uno queda registrado en un ADR.

| #   | Problema                                                                                                                                                                                              | Decisión                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | D-03 asume repo privado, pero GitHub Free no ofrece Environments con secretos ni aprobadores en privados                                                                                              | Repo público (D-03 cambia), con los controles de la sección 4                                               |
| 2   | `backup.yml` en el repo de código expondría sus logs al ser público                                                                                                                                   | Se mueve al repo privado de respaldos, junto con `PROD_DB_URL`                                              |
| 3   | **Error de cálculo en saldos anteriores:** con total 50 000, pagado 30 000 y 2 cuotas de 10 000, `cum_due` (prima + cuotas) no suma lo ya pagado y las cuotas saldrían pagadas con ₡20 000 pendientes | `cum_due` parte de `total − Σ cuotas`, con prueba pgTAP específica                                          |
| 4   | La prueba de catálogo exige permiso en toda RPC, y las reglas revocan `anon`, pero `ping()` lo necesita para el keep-alive                                                                            | Lista explícita de excepciones en la prueba: `ping` con `anon` (sin datos) y `get_my_profile`               |
| 5   | F8-T04 limpia datos E2E en staging, pero el trigger `prevent_delete` lo impide                                                                                                                        | Negocio E2E dedicado en staging y limpieza por script solo para staging; nunca en producción                |
| 6   | `UNIQUE(business_id, lower(name))` no es válido como restricción de tabla                                                                                                                             | Índice único por expresión                                                                                  |
| 7   | D-15 fija Node 22, pero ya hay líneas LTS más nuevas (24 y 26)                                                                                                                                        | Node 24 LTS: tiene más recorrido y ya es estable en el ecosistema; se confirma compatibilidad en la Etapa 0 |
| 8   | Los nombres de proyecto del roadmap (iniciales del negocio) y la marca revelarían el negocio en un repo público                                                                                       | Nombres genéricos `inv-*`                                                                                   |
| 9   | Req. Técnicos dice 17 tablas y el roadmap 19                                                                                                                                                          | Vale el roadmap (19: suma `sale_item_costs` y `notification_outbox`)                                        |
| 10  | Migraciones `0001_*` no siguen el formato de Supabase CLI                                                                                                                                             | Nombres con timestamp usando `supabase migration new`                                                       |
| 11  | El roadmap dice "CU-01 a CU-14 completos", pero D-18 saca de la beta el bloqueo tras 5 intentos y el PIN                                                                                              | Vale D-18                                                                                                   |

## 9. Riesgos

| Riesgo                                                    | Mitigación                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Exponer algo en el repo público                           | Sección 4, con controles automáticos y revisión por PR                          |
| Pausa de Supabase Free por inactividad                    | Keep-alive en ambos entornos desde F8; hasta entonces, reactivar desde el panel |
| Se excede el alcance o los PRs crecen                     | Revisión por etapa, PRs por tarea y reglas en `CLAUDE.md`                       |
| La aprobación de `production` depende de una sola persona | Aceptado para la beta; se documenta en el runbook de release                    |
| Preguntas abiertas D-06, D-07 y D-08                      | Se avanza con los valores asumidos; costo de cambio bajo o medio                |

## 10. Verificación

**Etapa 0 local**

- `pnpm install && pnpm check` en verde.
- `pnpm dev` muestra el frontend vacío.
- Una importación prohibida entre capas hace fallar ESLint.
- Un secreto falso en un commit es bloqueado por `gitleaks`.
- `git status` en `workspace/inventario-ventas/` no incluye nada de las carpetas vecinas.
- `docs/` y `web/` sin la marca: una búsqueda del nombre real del negocio no da resultados.

**Etapa 0 completa**

- PR de prueba con CI en verde en menos de 3 min.
- Push directo a `main` rechazado.
- Supabase local levanta con `supabase start`.

**Etapas siguientes:** criterios de la sección 2, CI en verde y demostración contigo antes de continuar.
