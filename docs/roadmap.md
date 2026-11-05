# Roadmap de Implementación — Beta (v0.9)

> **Copia de referencia** del documento fuente (2 nov 2026), sin datos que identifiquen al negocio.
> Ajustes vigentes: nombres de código en inglés (`docs/glosario.md`) y correcciones en `docs/decisiones/`.
> Donde este documento y un ADR difieran, manda el ADR.

> **Punto actual (3 nov 2026):** F0, F1 y F2 completas (etapas 0 y 1). Siguiente: Etapa 2 (F3 + F4), que empieza por su plan y espera visto bueno. Bitácora con fechas y PRs: [`docs/avance.md`](avance.md).

Revisión 2: lleva el sistema de un repositorio vacío a una beta en producción en 10 fases (F0–F9), más el modo sin conexión (F10) justo después.

## 1. Propósito y cómo usar este documento

Este roadmap lleva el sistema desde un repositorio vacío hasta una **versión beta desplegada en producción**, usada por el negocio con datos reales. Se basa en tres fuentes:

- **Requerimientos Funcionales** (rev. 17, que incluye RN-17, RN-18 y la sección 4.1 de confirmaciones y errores).
- **Requerimientos Técnicos — Tech Stack (v1)**.
- **Prototipo v2** "Inventario y Ventas" (lógica de cuotas, estados de cuenta, pantallas, tokens visuales).

**Cómo trabajar cada fase con Claude Code**

1. Copiar este documento al repositorio como `docs/roadmap.md` (Fase 0). Claude Code lo leerá desde ahí.
2. Una rama por fase (`fase-04-vender`), un PR por fase o por grupo de 2–4 tareas.
3. Al iniciar una fase, pedir primero un plan (modo plan) y luego implementar tarea por tarea.
4. Una fase está terminada solo cuando cumple su **Definición de terminado (DoD)** y el CI está en verde.
5. No saltar fases: cada una deja contratos (tablas, funciones, componentes) que la siguiente usa.

Prompt sugerido al inicio de cada fase:

```text
Lee CLAUDE.md y la sección "Fase N" de docs/roadmap.md.
Haz un plan para las tareas FN-T01 a FN-Txx: archivos a crear/modificar,
migraciones, pruebas. No implementes todavía.
```

Y luego:

```text
Implementa FN-T01 siguiendo el plan. Escribe primero las pruebas
(pgTAP para SQL, Vitest para TS), luego el código. Corre `pnpm check`
y `supabase test db` antes de terminar. Marca la tarea en docs/roadmap.md.
```

Convenciones: `FN-Txx` = tarea xx de la fase N. Tamaño relativo: **S** (una sesión corta), **M** (una sesión larga), **L** (varias sesiones).

## 2. Definición de la beta

**Beta = el negocio opera su día a día en el sistema**: vende, cobra, controla inventario y revisa su tablero, con al menos 3 usuarios reales (2 Administradores y 1 Vendedor), en producción, con respaldos diarios verificados y las deudas que hoy están en papel ya cargadas.

### 2.1 Dentro de la beta

| Área                     | Incluye                                                                                                                    |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Casos de uso             | CU-01 a CU-14 completos; CU-15 parcial (Negocio y Datos; usuarios se crean desde el panel de Supabase)                     |
| Reglas                   | RN-01 a RN-18 aplicadas en la base de datos y reflejadas en la interfaz                                                    |
| UX                       | RF-UX-01 a RF-UX-14, estándar de confirmaciones y errores (sección 4.1 funcional)                                          |
| Roles                    | Administrador y Vendedor, con matriz rol × permiso en tabla (RF-ROL-03); 2 Administradores y 1 Vendedor reales             |
| Datos anteriores         | Formulario "Cargar saldo anterior" para pasar las deudas del cuaderno al sistema (D-12)                                    |
| Marca                    | Nombre del negocio editable desde la app; ícono provisional fácil de reemplazar (D-19)                                     |
| Preparación sin conexión | Identificadores generados en el celular y fecha real de la venta, para que F10 no rehaga el modelo (D-05)                  |
| WhatsApp                 | Fase 0: enlace wa.me con mensaje armado (CU-07) y registro del recordatorio                                                |
| Operación                | CI/CD, staging + producción, respaldos nocturnos cifrados, prueba de restauración semanal, keep-alive, registro de errores |

### 2.2 Fuera de la beta

Pantalla de administración de usuarios (alta, cambio de rol, desactivar desde la app), bloqueo tras 5 intentos e inicio de sesión con teléfono + PIN, recordatorios automáticos por WhatsApp API, funcionamiento sin internet (es la **primera fase después de la beta**, F10), descuentos, devoluciones parciales, intereses, facturación electrónica, fotos de producto, proveedores/facturas en ingresos (RF-INV-03), varias sucursales y todo lo listado en 6.2 del documento funcional.

## 3. Decisiones de partida

Las decisiones marcadas **Asumida** se toman como default para no bloquear; se confirman en F0-T01. Cambiar una después tiene el costo indicado.

| ID   | Decisión                                                    | Valor                                                                                                                                                                                                                                                                                                                                                                | Estado                                                | Costo de cambiar después                                |
| ---- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| D-01 | Framework de interfaz                                       | React + TypeScript + Vite                                                                                                                                                                                                                                                                                                                                            | Recomendada en Req. Técnicos                          | Alto                                                    |
| D-02 | Inicio de sesión                                            | Correo + contraseña de Supabase Auth; registro público desactivado; usuarios creados a mano                                                                                                                                                                                                                                                                          | Decidida en Req. Técnicos                             | Bajo                                                    |
| D-03 | Repositorio de código                                       | Privado                                                                                                                                                                                                                                                                                                                                                              | Asumida                                               | Bajo                                                    |
| D-04 | Destino de respaldos                                        | Repositorio privado `inventario-backups`, como _release assets_ cifrados con age                                                                                                                                                                                                                                                                                     | Asumida                                               | Bajo                                                    |
| D-05 | Sin internet                                                | Habrá ferias y visitas sin señal: es **muy importante**. No entra en la beta; es la fase F10, inmediatamente después. Desde F1 el modelo queda listo: ids generados en el celular, fecha real de la venta (`client_created_at`), llaves de idempotencia                                                                                                              | Decidida (2 nov)                                      | Alto si no se prepara desde F1; bajo con la preparación |
| D-06 | Vender a pagos a cliente con cuotas vencidas                | Se permite, con aviso visible                                                                                                                                                                                                                                                                                                                                        | Asumida (7.2 funcional)                               | Bajo                                                    |
| D-07 | Frecuencia de cuotas                                        | Solo mensuales, 1–3 meses                                                                                                                                                                                                                                                                                                                                            | Asumida (7.2 funcional)                               | Medio                                                   |
| D-08 | Descuentos, devoluciones parciales, facturación electrónica | No en beta                                                                                                                                                                                                                                                                                                                                                           | Asumida (7.2 funcional)                               | Medio                                                   |
| D-09 | Fecha de vencimiento de cuota                               | Mismo día del mes siguiente; si no existe, último día del mes (31 ene → 28 feb)                                                                                                                                                                                                                                                                                      | Nueva — corrige el prototipo, que se desborda a marzo | Bajo                                                    |
| D-10 | Cuota mínima                                                | Si el redondeo deja alguna cuota en ₡0, se rechaza el plan: "Con este saldo, elige menos meses"                                                                                                                                                                                                                                                                      | Nueva                                                 | Bajo                                                    |
| D-11 | Costo en líneas de venta                                    | Tabla aparte `sale_item_costs` (solo Administrador), igual que `product_costs`                                                                                                                                                                                                                                                                                       | Nueva — refuerza "Vendedor no ve costos"              | Medio                                                   |
| D-12 | Saldos y deudas anteriores al sistema                       | Hoy están en papel. Se cargan a mano con el formulario de Administrador "Cargar saldo anterior", que crea una venta con `source = 'migracion'`: descripción en texto en lugar de productos, lo ya pagado y las cuotas restantes; no mueve stock. El inventario inicial se carga con "Producto nuevo" (CU-10)                                                         | Decidida (2 nov)                                      | Bajo                                                    |
| D-13 | Estilos                                                     | CSS Modules + variables CSS portadas del prototipo v2 (sin framework CSS)                                                                                                                                                                                                                                                                                            | Nueva                                                 | Medio                                                   |
| D-14 | Registro de errores del frontend                            | Sentry, plan gratuito, sin datos personales                                                                                                                                                                                                                                                                                                                          | Nueva (Req. Técnicos lo dejó a elegir)                | Bajo                                                    |
| D-15 | Gestor de paquetes y runtime                                | pnpm + Node 22 LTS                                                                                                                                                                                                                                                                                                                                                   | Nueva                                                 | Bajo                                                    |
| D-16 | Región de Supabase                                          | us-east-1 (menor latencia desde Costa Rica)                                                                                                                                                                                                                                                                                                                          | Nueva                                                 | Alto (requiere migrar proyecto)                         |
| D-17 | Momento de pasar a Supabase Pro                             | Al cumplir el primer mes con datos reales en producción, o antes si hay una pausa                                                                                                                                                                                                                                                                                    | Asumida (abierta en Req. Técnicos)                    | —                                                       |
| D-18 | Usuarios de la beta                                         | Al menos 3: 2 Administradores y 1 Vendedor, con correo + contraseña (D-02), creados desde el panel. La regla del último administrador y las pruebas de RLS con un Vendedor real son obligatorias. El bloqueo tras 5 intentos (CU-14) y teléfono + PIN quedan para después de la beta; mientras tanto se usan los límites de intentos de Supabase                     | Decidida (2 nov)                                      | Bajo                                                    |
| D-19 | Nombre e ícono                                              | El nombre del negocio es editable (Perfil → Negocio) y se usa en el encabezado, los mensajes de WhatsApp y los archivos exportados; nada en el código dice el nombre real del negocio. El nombre de la app instalada (manifest) es genérico y configurable por variable de entorno. El ícono es provisional y se reemplaza cambiando archivos en `web/public/icons/` | Decidida (2 nov)                                      | Bajo                                                    |

## 4. Mapa de fases

Orden recomendado: F0 → F1 → F2 → F3 → F4 → F6 → F5 → F7 → F8 → F9 → F10. F8 debe estar completa **antes** de cargar datos reales en F9.

| Fase | Nombre                                 | Entrega principal                                                             | Depende de                 | Tamaño |
| ---- | -------------------------------------- | ----------------------------------------------------------------------------- | -------------------------- | ------ |
| F0   | Fundaciones                            | Repo, entornos, CI base, CLAUDE.md                                            | —                          | M      |
| F1   | Modelo de datos y seguridad            | 19 tablas, RLS, roles y permisos, semillas                                    | F0                         | L      |
| F2   | Reglas de negocio en la base           | Funciones RPC, vistas de saldos y alertas, pruebas de concurrencia            | F1                         | L      |
| F3   | Esqueleto de la app                    | PWA, 6 secciones con deslizamiento, sesión, estándar de respuestas            | F1 (tipos)                 | L      |
| F4   | Vender y clientes                      | CU-01, CU-02, CU-03                                                           | F2, F3                     | L      |
| F5   | Historial y cobros                     | CU-04 a CU-07                                                                 | F4                         | L      |
| F6   | Inventario                             | CU-08 a CU-11                                                                 | F2, F3 (paralela a F4)     | M      |
| F7   | Inicio, perfil y tiempo real           | CU-12 a CU-15 (parcial), contadores, Realtime, exportación, saldos anteriores | F4, F5, F6                 | L      |
| F8   | Operación                              | Despliegues por tag, respaldos, restauración, keep-alive, monitoreo           | F2 (puede empezar tras F1) | M      |
| F9   | Endurecimiento y lanzamiento beta      | Datos reales, pruebas con la familia, v0.9.0-beta en producción               | Todas                      | M      |
| F10  | Modo sin conexión (después de la beta) | Vender, cobrar y crear clientes sin señal; sincronización al volver           | F9                         | L      |

## 5. Arquitectura del repositorio

```text
/
├─ CLAUDE.md                     Instrucciones para Claude Code
├─ docs/
│  ├─ roadmap.md                 Este documento (con casillas de avance)
│  ├─ decisiones/                ADRs cortos: D-01.md, D-02.md …
│  └─ runbooks/                  crear-usuario.md, restaurar-respaldo.md, rollback.md, release.md
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/                SQL versionado, solo hacia adelante
│  ├─ seed.sql                   Datos locales/staging (del prototipo v2)
│  ├─ bootstrap/prod.sql         Negocio, roles, permisos, catálogos (una sola vez)
│  ├─ tests/                     pgTAP: 00_schema.sql, 10_rls.sql, 20_registrar_venta.sql …
│  └─ functions/                 Edge Functions (vacío en beta; listo para WhatsApp)
├─ web/
│  ├─ index.html · vite.config.ts · tsconfig.json
│  └─ src/
│     ├─ app/                    Router, Track (deslizamiento), TabBar, AuthGate, providers
│     ├─ features/
│     │  ├─ inicio/  vender/  historial/  cobros/  inventario/  perfil/
│     │  └─ clientes/            CustomerPicker y alta rápida
│     ├─ components/ui/          Button, BusyButton, Sheet, Dialog, Toast, Banner, Chips, Seg, KPI, Empty…
│     ├─ lib/
│     │  ├─ supabase.ts · database.types.ts (generado)
│     │  ├─ money.ts · phone.ts · dates.ts · installments.ts · whatsapp.ts
│     │  ├─ errors.ts            Catálogo código SQL → mensaje en español
│     │  └─ idempotency.ts
│     ├─ hooks/                  usePermission, useRpcMutation, useRealtimeInvalidation
│     └─ styles/tokens.css       Variables del prototipo v2
├─ shared/fixtures/
│  └─ installments.cases.json    Casos de cuotas (Vitest + pgTAP)
├─ e2e/                          Playwright: smoke/ y full/
├─ workers/keepalive/            Cloudflare Worker con Cron Trigger
├─ scripts/                      importar-productos.ts (opcional), verificar-respaldo.sql
└─ .github/workflows/            ci.yml, deploy-staging.yml, release.yml, nightly.yml, backup.yml, restore-test.yml, health.yml
```

**Versiones:** usar la última estable de cada dependencia al iniciar F0 y fijarlas en `pnpm-lock.yaml`. Dependencias base: React 19, Vite, TypeScript (strict), `@supabase/supabase-js` v2, `@tanstack/react-query` v5, `zod`, `react-router`, `date-fns` + `date-fns-tz`, `vite-plugin-pwa`, Vitest, Playwright, ESLint (flat config), Prettier, sqlfluff (dialecto postgres), Supabase CLI.

## 6. Convenciones técnicas transversales

Estas reglas aplican a todas las fases y van resumidas en `CLAUDE.md`.

**Datos**

- Montos en colones como `integer` (RN-13); nunca `numeric` ni flotantes. Toda cantidad de dinero > 0 lleva `CHECK`.
- Teléfonos guardados en E.164 (`+50680000001`), `CHECK (phone_e164 ~ '^\+506[0-9]{8}$')`; se muestran como `8000-0001`.
- Fechas-hora en `timestamptz`; fechas de vencimiento en `date`. "Hoy" se calcula en la zona del negocio: `(now() AT TIME ZONE b.timezone)::date`, con `timezone = 'America/Costa_Rica'`.
- Toda tabla de negocio lleva `business_id uuid NOT NULL` desde el día uno.
- Estados como `text` + `CHECK (... IN (...))`, no tipos `ENUM` (más fáciles de extender).
- Nada se borra (RN-12): trigger `private.prevent_delete()` en tablas transaccionales; `sales`, `payments`, `inventory_movements` y `activity_log` además son inmutables salvo las columnas de anulación.

**Seguridad**

- RLS activado en **todas** las tablas. El navegador **lee** con `SELECT` filtrado por RLS y **escribe solo por RPC**.
- No se otorgan `INSERT/UPDATE/DELETE` a `authenticated` en ninguna tabla.
- Funciones RPC en el esquema `public`, `SECURITY DEFINER`, `SET search_path = ''`, nombres de tablas calificados (`public.sales`), verificación explícita de permiso al inicio con `private.require_perm('ventas.registrar')`. `REVOKE EXECUTE ... FROM public, anon`; `GRANT EXECUTE ... TO authenticated`.
- Funciones auxiliares en el esquema `private` (no expuesto por la API).
- En el frontend solo va la clave pública (publishable/anon). La clave de servicio solo en GitHub Secrets y Edge Functions.

**Contrato de las RPC**

- Retornan `jsonb` con `status`: `ok`, `replay` (misma llave de idempotencia ya guardada), `possible_duplicate` (RN-18, no guarda nada), `similar` o `exists` (según la función).
- Errores de negocio con `RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '<codigo>', DETAIL = '<json>'`. Códigos en `snake_case`: `sin_cliente`, `stock_insuficiente`, `total_cambio`, `prima_invalida`, `plazo_invalido`, `plazo_muy_largo`, `abono_mayor_saldo`, `venta_anulada`, `ya_anulada`, `cambio_concurrente`, `sin_permiso`, `telefono_invalido`, `producto_inactivo`.
- `web/src/lib/errors.ts` traduce cada código al mensaje de la sección 4.1 ("Solo quedan 2 de Rosa Imperial; ajusta la cantidad"). Un error desconocido muestra "No se pudo guardar. Revisa tu internet y toca Reintentar."

**Idempotencia y duplicados (RN-18)**

- Toda RPC que crea registros recibe `p_idempotency_key uuid` (columna `UNIQUE`). El frontend genera la llave con `crypto.randomUUID()` al primer intento, la reutiliza en cada reintento y la descarta solo tras éxito.
- Detección de posible duplicado en 10 minutos dentro de la función; si existe y `p_confirm_duplicate = false`, retorna `possible_duplicate` con el registro existente. El frontend pide confirmar y vuelve a llamar con `true` y la misma llave.

**Preparación para trabajar sin conexión (D-05)**

- Las RPC que crean ventas, clientes y abonos aceptan el `id` generado en el celular (`p_id uuid`); si no viene, la base lo genera. Así una venta hecha sin señal puede apuntar a un cliente creado sin señal.
- Las ventas y los abonos guardan `client_created_at` (cuándo ocurrió de verdad) además de `created_at` (cuándo llegó a la base). Historial, vencimientos y análisis usan `client_created_at`.
- El folio lo asigna siempre la base, al guardar. Nada en la interfaz puede depender de conocer el folio antes de guardar.
- La interfaz habla con la base a través de una sola capa (`useRpcMutation`), para que en F10 se pueda poner una cola debajo sin tocar pantallas.

**Interfaz**

- Lenguaje de la casa (principio 3): "Cobrar", "Abono", "Quedan 3". Nada de "transacción", "SKU", "error 500".
- Toda acción que guarda termina en confirmación visible o error con salida (RN-17). Botón ocupado deshabilitado mientras guarda (evita doble toque).
- Montos con `Intl.NumberFormat('es-CR')` → `₡38 000`; fechas cortas "2 nov"; relativas "hace 5 min".
- Objetivos táctiles ≥ 44×44 px, texto ≥ 15 px, `inputmode="numeric"` en montos y teléfonos.

**Pruebas**

- SQL: pgTAP por regla de negocio y por RPC. TS: Vitest para `lib/`. E2E: Playwright con viewport de celular.
- `shared/fixtures/installments.cases.json` es la única fuente de casos de cuotas para SQL y TS.

## 7. Fases

### Fase 0 — Fundaciones

**Objetivo:** dejar listo el terreno para que cada fase siguiente solo agregue código: repo, herramientas, entornos y un CI que ya corre.

| ID         | Tarea                                                                                                                                                                                                                                                                                                                                                                                    | Tamaño |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [x] F0-T01 | Confirmar decisiones D-01 a D-19 y escribir un ADR corto por cada una en `docs/decisiones/`                                                                                                                                                                                                                                                                                              | S      |
| [x] F0-T02 | Crear repo privado en GitHub; proteger `main` (PR obligatorio, CI en verde, sin force push); activar Dependabot o Renovate semanal                                                                                                                                                                                                                                                       | S      |
| [x] F0-T03 | Estructura de carpetas (sección 5); `pnpm` workspace con `web`, `e2e`, `workers/keepalive`, `scripts`; `.nvmrc` con Node 22; TS strict; ESLint flat; Prettier; `.sqlfluff`; `.editorconfig`                                                                                                                                                                                              | M      |
| [x] F0-T04 | Escribir `CLAUDE.md` (contenido abajo) y copiar este roadmap a `docs/roadmap.md`                                                                                                                                                                                                                                                                                                         | S      |
| [x] F0-T05 | Crear proyectos Supabase `inv-staging` y `inv-prod` (región D-16). En ambos: desactivar "Allow new users to sign up", contraseña mínima 10, Site URL de cada entorno. Habilitar extensiones `pg_trgm`, `unaccent`, `pg_cron`                                                                                                                                                             | S      |
| [x] F0-T06 | `supabase init`; `supabase start` local; documentar en README cómo levantar todo con un comando (`pnpm dev`)                                                                                                                                                                                                                                                                             | S      |
| [x] F0-T07 | Cloudflare: crear proyecto Pages `inv-web` por _direct upload_ (sin integración Git; el deploy lo hace Actions con `wrangler`); token de API con permiso solo para Pages y Workers. **Nota (3 nov 2026):** cuenta, sesión de `wrangler` y token listos; el proyecto `inv-web` se crea en la Etapa 4, porque Cloudflare integró Pages en Workers y el destino se decide con un build real | S      |
| [x] F0-T08 | `ci.yml` inicial: `dorny/paths-filter`, `concurrency` con `cancel-in-progress`, jobs `static` (eslint, tsc, sqlfluff) y `unit` (vitest), caché de pnpm                                                                                                                                                                                                                                   | M      |
| [x] F0-T09 | Cargar GitHub Secrets (lista abajo) y variables por entorno (`staging`, `production` como GitHub Environments; `production` con aprobación manual)                                                                                                                                                                                                                                       | S      |
| [x] F0-T10 | Borrador de `shared/fixtures/installments.cases.json` con los casos de F2-T01                                                                                                                                                                                                                                                                                                            | S      |

**Contenido mínimo de `CLAUDE.md`:**

- Qué es el sistema en 3 líneas y enlace a `docs/roadmap.md`.
- Comandos: `pnpm dev`, `pnpm check` (lint + tsc + vitest), `supabase start`, `supabase db reset`, `supabase test db`, `pnpm gen:types`, `pnpm e2e:smoke`.
- Reglas no negociables: la base es la autoridad; escrituras solo por RPC; migraciones solo hacia adelante (nunca editar una migración ya fusionada); montos enteros; nada se borra; RLS en toda tabla nueva con prueba pgTAP; textos en español sencillo; toda acción con confirmación o error (RN-17); preparación sin conexión (sección 6).
- Al crear una RPC: `SECURITY DEFINER`, `SET search_path = ''`, `require_perm`, `REVOKE/GRANT`, prueba pgTAP, código de error agregado a `lib/errors.ts`.
- Después de cambiar SQL: regenerar tipos y confirmar que no hay _drift_.
- Al terminar una tarea: marcarla en `docs/roadmap.md`.

**GitHub Secrets:** `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF_STAGING`, `SUPABASE_PROJECT_REF_PROD`, `SUPABASE_DB_PASSWORD_STAGING`, `SUPABASE_DB_PASSWORD_PROD`, `PROD_DB_URL` (pooler de sesión, para pg\_dump), `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` por entorno, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `BACKUP_AGE_RECIPIENT` (clave pública), `BACKUPS_REPO_TOKEN` (token fino con acceso solo al repo de respaldos), `E2E_ADMIN_EMAIL/PASSWORD`, `E2E_VENDEDOR_EMAIL/PASSWORD` (solo staging), `SENTRY_DSN`.

**DoD F0:** `pnpm dev` levanta el frontend vacío y Supabase local; un PR de prueba corre `static` y `unit` en verde en menos de 3 minutos; `CLAUDE.md` y `docs/roadmap.md` en `main`.

### Fase 1 — Modelo de datos, roles y seguridad

**Objetivo:** el esquema completo, con RLS y permisos, probado. Al terminar, ningún usuario puede leer lo que su rol no permite ni escribir directamente en ninguna tabla.

| ID         | Tarea                                                                                                                                                                                                                                                                                                                       | Tamaño |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [x] F1-T01 | Migración `0001_extensions_schemas`: esquema `private`; extensiones; funciones `private.prevent_delete()`, `private.touch_updated_at()`                                                                                                                                                                                     | S      |
| [x] F1-T02 | Migración `0002_tenancy_auth`: `businesses`, `permissions`, `roles`, `role_permissions`, `profiles`                                                                                                                                                                                                                         | M      |
| [x] F1-T03 | Migración `0003_catalogs`: `categories`, `payment_methods`, `customers`                                                                                                                                                                                                                                                     | S      |
| [x] F1-T04 | Migración `0004_inventory`: `products`, `product_costs`, `inventory_movements`                                                                                                                                                                                                                                              | M      |
| [x] F1-T05 | Migración `0005_sales`: `sales`, `sale_items`, `sale_item_costs`, `installments`, `payments`                                                                                                                                                                                                                                | M      |
| [x] F1-T06 | Migración `0006_notifications_activity`: `reminders`, `notification_outbox`, `activity_log`                                                                                                                                                                                                                                 | S      |
| [x] F1-T07 | Funciones de seguridad: `private.current_business_id()`, `private.has_perm(text)`, `private.require_perm(text)`; políticas RLS de todas las tablas                                                                                                                                                                          | M      |
| [x] F1-T08 | Triggers: inmutabilidad, `prevent_delete`, `updated_at`, protección del último administrador activo, `activity_log` por inserción en `sales`, `payments`, `inventory_movements`, `products`, `customers`                                                                                                                    | M      |
| [x] F1-T09 | Índices (lista abajo)                                                                                                                                                                                                                                                                                                       | S      |
| [x] F1-T10 | `seed.sql` con datos del prototipo v2 (10 productos, 15 clientes, 15 ventas con cuotas y abonos) + usuarios de prueba `admin@test.local`, `admin2@test.local` y `vendedor@test.local` (misma composición que la beta, D-18); `bootstrap/prod.sql` con negocio, roles, permisos y catálogos, sin nombre de marca fijo (D-19) | M      |
| [x] F1-T11 | pgTAP: esquema, RLS por rol, aislamiento por negocio, borrado bloqueado, último administrador                                                                                                                                                                                                                               | M      |
| [x] F1-T12 | Script `pnpm gen:types` y verificación de _drift_ en CI                                                                                                                                                                                                                                                                     | S      |

**Esquema (resumen DDL).** Todas las tablas tienen `id uuid PK DEFAULT gen_random_uuid()` salvo que se indique, y `created_at timestamptz NOT NULL DEFAULT now()`.

```sql
businesses(name text NOT NULL, timezone text NOT NULL DEFAULT 'America/Costa_Rica',
  last_folio int NOT NULL DEFAULT 1000)            -- contador de folios RN-15

permissions(code text PK, description text NOT NULL)   -- catálogo global
roles(business_id, code text, name text, UNIQUE(business_id, code))
role_permissions(role_id → roles, permission_code → permissions, PK(role_id, permission_code))
profiles(id uuid PK → auth.users, business_id, full_name text NOT NULL,
  phone_e164 text NULL, role_id → roles, active bool NOT NULL DEFAULT true, updated_at)

categories(business_id, name text, prefix text NOT NULL,   -- 'PER', 'BIS'
  last_seq int NOT NULL DEFAULT 0, active bool, sort int,
  UNIQUE(business_id, lower(name)), UNIQUE(business_id, prefix))
payment_methods(business_id, name text, active bool, sort int, UNIQUE(business_id, lower(name)))
customers(business_id, name text CHECK (length(trim(name)) >= 2),
  phone_e164 text NOT NULL CHECK (...), email text, zone text, notes text,
  whatsapp_opt_in bool NOT NULL DEFAULT false, whatsapp_opt_in_at timestamptz,
  created_by → profiles, updated_at, UNIQUE(business_id, phone_e164))

products(business_id, code text NOT NULL, name text NOT NULL, category_id → categories,
  price int NOT NULL CHECK (price > 0), stock int NOT NULL CHECK (stock >= 0),
  min_stock int NOT NULL DEFAULT 0 CHECK (min_stock >= 0), active bool NOT NULL DEFAULT true,
  version int NOT NULL DEFAULT 1, updated_at, UNIQUE(business_id, code))
product_costs(product_id uuid PK → products, unit_cost int NOT NULL CHECK (unit_cost >= 0),
  updated_by, updated_at)
inventory_movements(business_id, product_id, type text CHECK (type IN
  ('inicial','ingreso','venta','anulacion','ajuste')), qty_delta int CHECK (qty_delta <> 0),
  stock_after int NOT NULL, unit_cost int NULL, sale_id NULL → sales, reason text,
  idempotency_key uuid UNIQUE NULL, created_by)

sales(business_id, folio int NOT NULL, customer_id NOT NULL → customers,   -- RN-01
  seller_id → profiles, type text CHECK (type IN ('contado','pagos')),
  total int CHECK (total > 0), months smallint NULL, down_payment int NOT NULL DEFAULT 0,
  payment_method_id → payment_methods, source text NOT NULL DEFAULT 'app'
  CHECK (source IN ('app','migracion')), idempotency_key uuid NOT NULL UNIQUE,
  client_created_at timestamptz NOT NULL DEFAULT now(),                    -- D-05
  description text NULL,                                                    -- D-12
  CHECK (source = 'app' OR description IS NOT NULL),
  voided_at timestamptz, voided_by, void_reason text,
  UNIQUE(business_id, folio),
  CHECK ((type='contado' AND months IS NULL AND down_payment = 0) OR
         (type='pagos' AND months BETWEEN 1 AND 3 AND down_payment >= 0
          AND down_payment < total)),                                         -- RN-03, RN-05
  CHECK ((voided_at IS NULL) = (void_reason IS NULL)))
sale_items(sale_id → sales, product_id → products, product_name text NOT NULL,  -- copia
  qty int CHECK (qty > 0), unit_price int CHECK (unit_price > 0))              -- RN-16
sale_item_costs(sale_item_id uuid PK → sale_items, unit_cost int NOT NULL)      -- D-11
installments(sale_id → sales, number smallint, due_date date NOT NULL,
  amount int CHECK (amount > 0), UNIQUE(sale_id, number))
payments(business_id, sale_id → sales,
  kind text CHECK (kind IN ('contado','prima','abono','previo')),  -- previo = pagado antes del sistema (D-12)
  amount int CHECK (amount > 0), payment_method_id NULL, received_by → profiles,
  client_created_at timestamptz NOT NULL DEFAULT now(), idempotency_key uuid UNIQUE NULL)

reminders(business_id, sale_id, customer_id, channel text CHECK (channel IN
  ('whatsapp_link','whatsapp_api')), status text, sent_by, outbox_id NULL)
notification_outbox(business_id, channel, template text, recipient_e164 text,
  payload jsonb, status text CHECK (status IN ('abierto','pendiente','enviado','fallido')),
  attempts int DEFAULT 0, last_error text, sent_at timestamptz)
activity_log(id bigint identity PK, business_id, actor_id, type text, entity text,
  entity_id uuid, summary text, amount int NULL, data jsonb)
```

**Permisos (catálogo inicial, de la matriz 2.2 funcional):**

| Código                                                                                                                                                               | Admin | Vendedor |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | -------- |
| `ventas.registrar`, `ventas.ver`, `clientes.editar`, `abonos.registrar`, `recordatorios.enviar`, `inventario.ver`, `tablero.ver`                                     | Sí    | Sí       |
| `ventas.anular`, `costos.ver`, `inventario.ingresar`, `productos.editar`, `analisis.ganancia`, `usuarios.admin`, `negocio.config`, `datos.exportar`, `saldos.cargar` | Sí    | No       |

**Políticas RLS:**

- Lectura: `USING (business_id = private.current_business_id())` en todas las tablas con `business_id`; tablas hijas (`sale_items`, `installments`) por `EXISTS` sobre la venta padre.
- `product_costs` y `sale_item_costs`: además `private.has_perm('costos.ver')`.
- `profiles`: cada uno ve los perfiles de su negocio; nadie actualiza directo.
- `current_business_id()` y `has_perm()` son `STABLE SECURITY DEFINER`, leen `profiles` del `auth.uid()` y exigen `active = true`; un usuario desactivado obtiene `NULL` y no ve nada.

**Índices:** `sales(business_id, client_created_at DESC, id)`, `sales(customer_id)`, `sales(business_id, folio)`, `installments(sale_id, number)`, `installments(due_date)`, `payments(sale_id, client_created_at)`, `customers(business_id, phone_e164)`, `customers USING gin (lower(unaccent(name)) gin_trgm_ops)`, `products USING gin (lower(unaccent(name)) gin_trgm_ops)`, `products(business_id, category_id)`, `inventory_movements(product_id, created_at DESC)`, `activity_log(business_id, created_at DESC)`.

**Pruebas pgTAP mínimas:** Vendedor no puede leer `product_costs` ni `sale_item_costs`; usuario de otro negocio ve 0 filas; `authenticated` no puede `INSERT` en ninguna tabla; `DELETE` en `sales` falla incluso como `postgres`; desactivar al único administrador falla; usuario desactivado ve 0 filas; `CHECK` de prima ≥ total falla.

**DoD F1:** `supabase db reset` aplica todo y carga la semilla; `supabase test db` en verde; `supabase db lint` sin errores; tipos generados sin _drift_; el job `db` del CI corre en PRs que tocan `supabase/**`.

### Fase 2 — Reglas de negocio en la base

**Objetivo:** cada caso de uso que escribe datos es una sola función transaccional; saldos, cuotas vencidas y alertas salen de vistas. Al terminar, se podría operar el negocio solo con llamadas RPC.

| ID         | Tarea                                                                                                                                                                                                             | Tamaño |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [x] F2-T01 | `private.calc_cuotas(total int, prima int, meses int, fecha date, primera date DEFAULT NULL) RETURNS TABLE(number, due_date, amount)`; con `primera`, la cuota i vence en `primera + (i−1) meses` (lo usa F2-T14) | S      |
| [x] F2-T02 | Completar `installments.cases.json` y prueba pgTAP que lo recorre (cargado con `pg_read_file` o generado a SQL por script)                                                                                        | S      |
| [x] F2-T03 | `registrar_venta`                                                                                                                                                                                                 | L      |
| [x] F2-T04 | `crear_cliente`, `actualizar_cliente`, `buscar_clientes`                                                                                                                                                          | M      |
| [x] F2-T05 | `registrar_abono`                                                                                                                                                                                                 | M      |
| [x] F2-T06 | `anular_venta`                                                                                                                                                                                                    | M      |
| [x] F2-T07 | `crear_producto`, `ingresar_stock`, `actualizar_producto` (incluye ajuste de conteo y desactivar)                                                                                                                 | M      |
| [x] F2-T08 | `registrar_recordatorio`                                                                                                                                                                                          | S      |
| [x] F2-T09 | Configuración: `actualizar_negocio`, `guardar_categoria`, `guardar_metodo_pago`; `mi_perfil()`; `ping()`                                                                                                          | S      |
| [x] F2-T10 | Vistas de lectura (`security_invoker = true`)                                                                                                                                                                     | M      |
| [x] F2-T11 | RPC de lectura agregada: `resumen_inicio`, `resumen_cobros`, `resumen_inventario`, `contadores`, `analisis`, `exportar_datos`                                                                                     | M      |
| [x] F2-T12 | Pruebas de concurrencia (Vitest + `pg` contra Postgres local)                                                                                                                                                     | M      |
| [x] F2-T13 | Agregar tablas a la publicación `supabase_realtime`: `sales`, `payments`, `products`, `inventory_movements`, `customers`, `activity_log`                                                                          | S      |
| [x] F2-T14 | `registrar_saldo_anterior` (D-12)                                                                                                                                                                                 | M      |

**F2-T01 · Cálculo de cuotas (RN-03, RN-04, D-09, D-10)**

```text
saldo   = total − prima
cuota   = floor(saldo / meses / 100) × 100
cuotas 1..meses−1 = cuota ;  última = saldo − cuota × (meses − 1)
vence_i = fecha + i meses   (Postgres: date + interval 'i month' ya ajusta a fin de mes;
                             TS: date-fns addMonths, que hace lo mismo)
si cuota = 0 → error 'plazo_muy_largo'
```

Casos obligatorios en el JSON: 30 000 / prima 0 / 3 meses → 10 000 ×3; 25 000 / 0 / 3 → 8 300, 8 300, 8 400; 38 500 / 10 000 / 3 → 9 500 ×3; 26 000 / 5 000 / 2 → 10 500 ×2; 9 500 / 0 / 1 → 9 500; venta 31 ene 2026 / 1 mes → vence 28 feb 2026; venta 30 nov 2026 / 3 meses → 30 dic, 30 ene, 28 feb 2027; 200 / 0 / 3 → error `plazo_muy_largo`; saldo anterior 20 000 / 2 cuotas / primera 15 oct 2026 → 15 oct y 15 nov 2026, 10 000 ×2.

**F2-T03 · `registrar_venta`**

```sql
registrar_venta(
  p_idempotency_key uuid, p_customer_id uuid, p_type text,
  p_items jsonb,               -- [{"product_id": "...", "qty": 2}]
  p_payment_method_id uuid, p_expected_total int,
  p_months int DEFAULT NULL, p_down_payment int DEFAULT 0,
  p_confirm_duplicate bool DEFAULT false,
  p_id uuid DEFAULT NULL,                  -- id generado en el celular (D-05)
  p_client_created_at timestamptz DEFAULT NULL
) RETURNS jsonb   -- {status, sale:{id, folio, total, type}, existing?}
```

Orden dentro de la transacción:

1. `require_perm('ventas.registrar')`.
2. Si existe una venta con esa llave → `{status:'replay', sale}`.
3. Validar cliente del mismo negocio (RN-01) → `sin_cliente`.
4. Normalizar ítems (sumar líneas repetidas, qty > 0, al menos uno).
5. `SELECT ... FROM products WHERE id = ANY(...) ORDER BY id FOR UPDATE` (orden fijo evita bloqueos cruzados). Producto inactivo → `producto_inactivo`; stock insuficiente → `stock_insuficiente` con `{product, disponible}` (RN-02).
6. Total con precios actuales de la base (nunca del cliente). Si ≠ `p_expected_total` → `total_cambio` con el total nuevo.
7. Si `pagos`: validar meses 1–3 y `0 ≤ prima < total` (RN-05); calcular plan con `calc_cuotas`.
8. Posible duplicado: misma persona, mismo total, mismos productos y cantidades, no anulada, en los últimos 10 min, y `p_confirm_duplicate = false` → `{status:'possible_duplicate', existing}` sin escribir.
9. Folio: `UPDATE businesses SET last_folio = last_folio + 1 WHERE id = ... RETURNING last_folio` (bloqueo de fila; sin huecos porque un rollback lo revierte).
10. Insertar `sales`, `sale_items` (nombre y precio del día), `sale_item_costs` (costo del día desde `product_costs`).
11. `UPDATE products SET stock = stock - qty ... WHERE stock >= qty`; si alguna fila no se actualiza → `stock_insuficiente` (defensa doble). Movimiento `venta` por línea con `stock_after`.
12. `installments` del plan; `payments`: `contado` por el total, o `prima` si > 0.
13. Retornar `{status:'ok', sale}`. El trigger escribe `activity_log`.

**F2-T04 · Clientes (CU-03)**

- `crear_cliente(p_name, p_phone, p_email, p_zone, p_notes, p_whatsapp_opt_in, p_id DEFAULT NULL)`: normaliza teléfono a E.164 (acepta `8000-0001`, `80000001`, `+506 8811 2233`); si el teléfono ya existe → `{status:'exists', customer}` (no error) para que la UI pregunte "¿Es la misma persona?".
- `buscar_clientes(p_q text, p_limit int DEFAULT 8)`: coincide por dígitos del teléfono o por nombre sin tildes (`unaccent` + `ILIKE` + `similarity`); retorna `balance` y `overdue` de `v_customer_balances`.

**F2-T05 · `registrar_abono` (CU-06, RN-06, RN-08)**

`registrar_abono(p_idempotency_key, p_sale_id, p_amount, p_payment_method_id, p_confirm_duplicate DEFAULT false, p_client_created_at DEFAULT NULL)`: bloquea la venta (`FOR UPDATE`) para serializar abonos a la misma cuenta; rechaza venta anulada o de contado; saldo = total − Σ pagos; `p_amount > saldo` → `abono_mayor_saldo` con el saldo; duplicado = mismo monto, misma venta, 10 min. Retorna `{status, balance, liquidada}`. El pago no se asigna a una cuota concreta: la aplicación a "la cuota más antigua" se deriva por acumulados en la vista (igual que `acct()` del prototipo).

**F2-T06 · `anular_venta` (CU-05, RN-09, RN-11)**

`anular_venta(p_sale_id, p_reason)`: `require_perm('ventas.anular')`; `UPDATE sales SET voided_at = now(), voided_by = auth.uid(), void_reason = p_reason WHERE id = ... AND voided_at IS NULL RETURNING ...`; si no afecta filas → `ya_anulada` con quién y cuándo; devuelve stock con movimientos `anulacion`. La advertencia "ya se recibieron ₡X" la muestra la UI **antes** de confirmar, leyendo `v_sale_accounts.paid`.

**F2-T07 · Inventario (CU-09 a CU-11)**

- `crear_producto(p_idempotency_key, p_name, p_category_id, p_price, p_min_stock, p_initial_qty, p_unit_cost, p_confirm_similar DEFAULT false)`: si hay nombres iguales o con `similarity > 0.6` y no se confirmó → `{status:'similar', candidates}`. Código = `prefix || '-' || lpad(last_seq+1, 3, '0')` con bloqueo de la categoría. Movimiento `inicial` si qty > 0.
- `ingresar_stock(p_idempotency_key, p_product_id, p_qty, p_unit_cost DEFAULT NULL, p_confirm_duplicate DEFAULT false)`: suma stock, movimiento `ingreso`, actualiza `product_costs` si viene costo; duplicado = mismo producto y cantidad en 10 min.
- `actualizar_producto(p_product_id, p_expected_version, p_name, p_price, p_min_stock, p_unit_cost, p_counted_stock DEFAULT NULL, p_active DEFAULT NULL)`: `WHERE version = p_expected_version`, si no → `cambio_concurrente`; `version = version + 1`; si el conteo difiere, movimiento `ajuste` con `reason = 'Ajuste de conteo: 5 → 4'`.

**F2-T14 · `registrar_saldo_anterior` (D-12)**

```sql
registrar_saldo_anterior(
  p_idempotency_key uuid, p_customer_id uuid,
  p_fecha_venta date,          -- cuándo se vendió, según el cuaderno
  p_descripcion text,          -- "Perfume Rosa + aretes", tal como está anotado
  p_total int,                 -- total original de la venta
  p_pagado int,                -- lo que ya pagó antes del sistema (≥ 0, < total)
  p_cuotas int,                -- cuotas que faltan: 1 a 3
  p_primera_cuota date         -- vencimiento de la próxima cuota
) RETURNS jsonb
```

`require_perm('saldos.cargar')`; crea `sales` con `type = 'pagos'`, `source = 'migracion'`, `description`, folio normal y `client_created_at = p_fecha_venta`; sin `sale_items` ni movimientos de stock; un pago `previo` por `p_pagado` si > 0; cuotas con `calc_cuotas(total − pagado, 0, p_cuotas, …)` venciendo desde `p_primera_cuota` (puede estar en el pasado: esas cuotas aparecen vencidas, como en la realidad). La venta aparece en Por cobrar e Historial con la etiqueta "Saldo anterior" y no cuenta en el análisis de ventas del periodo.

**F2-T10 · Vistas de lectura**

| Vista                  | Columnas clave                                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v_installment_status` | sale\_id, number, due\_date, amount, `cum_due` (prima + Σ cuotas hasta esta), `paid_total`, `status` ∈ pagada / parcial / pendiente / vencida (RN-07)    |
| `v_sale_accounts`      | sale\_id, paid, balance, `status` ∈ contado / pendiente / vencida / pagada / anulada, next\_due\_date, next\_due\_amount, overdue\_amount, progress\_pct |
| `v_customer_balances`  | customer\_id, balance, overdue\_amount, open\_sales                                                                                                      |
| `v_products_status`    | product\_id, stock, min\_stock, `stock_status` ∈ ok / bajo / agotado (RN-10), units\_sold                                                                |
| `v_alerts`             | kind (cuota\_vencida, cuota\_proxima, agotado, stock\_bajo), severity (urgente / atencion), entity\_id, title, amount, due\_date                         |
| `v_sales_list`         | venta + cliente + vendedor + estado, para Historial con filtros y paginación por cursor `(client_created_at, id)`                                        |

Regla de vencida: `due_date < hoy_negocio AND paid_total < cum_due`. Ventas anuladas se excluyen de saldos, alertas y totales.

**F2-T11 · Lecturas agregadas:** `resumen_inicio()` → ventas de hoy, ventas 30 días, total por cobrar, productos con stock bajo (RF-DSH-01). `resumen_cobros()` → total por cobrar, total vencido, vence en 7 días (RF-COB-01). `resumen_inventario()` → unidades, valor a precio y, si `costos.ver`, valor a costo. `contadores()` → cuentas vencidas y productos bajo/agotados para la barra (RF-UX-04). `analisis(p_dias int)` → vendido, cobrado (Σ pagos del periodo), venta promedio, serie diaria contado/pagos, mezcla, top 5 productos, ventas por categoría; ganancia bruta y margen solo si `analisis.ganancia`, si no `null`. `exportar_datos()` → `datos.exportar`; jsonb con ventas, líneas, pagos, clientes, productos y movimientos.

**F2-T12 · Concurrencia (secciones 5 y 8 de Req. Técnicos):** stock 1 y dos `registrar_venta` simultáneas → exactamente una `ok`, stock final 0; misma llave dos veces en paralelo → una venta; 20 ventas en paralelo → folios consecutivos sin huecos ni repetidos; dos `anular_venta` simultáneas → una `ok`, otra `ya_anulada`; dos abonos que juntos superan el saldo → uno falla con `abono_mayor_saldo`.

**DoD F2:** pgTAP cubre cada RN-01 a RN-18 aplicable en base con al menos un caso feliz y uno de rechazo; pruebas de concurrencia en verde; una RPC sin `require_perm` hace fallar una prueba de catálogo (pgTAP que recorre `pg_proc` del esquema `public`).

### Fase 3 — Esqueleto de la app

**Objetivo:** una PWA instalable con las 6 secciones, sesión real, permisos y el sistema de respuestas listo, para que F4–F7 solo llenen pantallas.

| ID         | Tarea                                                                                                                                                                                                                                                                                                                                                                                                                      | Tamaño |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [x] F3-T01 | Vite + React + TS; `tokens.css` portado del prototipo v2 (`--brand #5b2a5e`, `--gold #b8873a`, `--bg #f7f3ee`, estados ok/warn/bad, radios, sombras, `safe-area`)                                                                                                                                                                                                                                                          | S      |
| [x] F3-T02 | Router con rutas `/`, `/vender`, `/historial`, `/por-cobrar`, `/inventario`, `/perfil`; componente `Track` con `scroll-snap` sincronizado con la ruta (deslizar cambia ruta, tocar pestaña desplaza); flechas del teclado en escritorio (RF-UX-02, 03)                                                                                                                                                                     | M      |
| [x] F3-T03 | `TabBar`: abajo en celular, arriba ≥ 900 px; indicador animado; contador rojo (RF-UX-01, 04)                                                                                                                                                                                                                                                                                                                               | S      |
| [x] F3-T04 | `Sheet` que sube desde abajo, abierto por parámetro de URL (`?venta=<id>`, `?cliente=`, `?producto=`) para que "atrás" lo cierre (RF-UX-05)                                                                                                                                                                                                                                                                                | M      |
| [ ] F3-T05 | Sesión: pantalla de entrada (correo + contraseña), `AuthGate`, sesión persistente (RF-PER-01), carga de `mi_perfil()` → negocio, rol, permisos; `usePermission()` y `<Can perm>`                                                                                                                                                                                                                                           | M      |
| [ ] F3-T06 | Respuestas (RN-17, sección 4.1, RF-FB-01 a 08): `Toast`, `Banner`, `FieldError` (enfoca y desplaza al campo), `Dialog` (confirmar / peligro), `BusyButton`, `ErrorState` con Reintentar, `Empty`, resaltado del registro nuevo, "¿Descartar cambios?" al cerrar un formulario con cambios                                                                                                                                  | M      |
| [ ] F3-T07 | `useRpcMutation(fn)`: llave de idempotencia, mapeo de errores con `lib/errors.ts`, manejo de `possible_duplicate` / `similar` / `exists` con diálogo, invalidación de consultas, toast de éxito                                                                                                                                                                                                                            | M      |
| [x] F3-T08 | `lib/`: `money.ts`, `phone.ts`, `dates.ts` (zona CR, "Hoy/Ayer", relativas), `installments.ts` (espejo de `calc_cuotas`), `whatsapp.ts`; pruebas Vitest, incluida la tabla compartida de cuotas                                                                                                                                                                                                                            | M      |
| [ ] F3-T09 | PWA con `vite-plugin-pwa`: manifest con nombre genérico tomado de `VITE_APP_NAME` (D-19), íconos provisionales en `web/public/icons/` (inicial sobre `--brand`, 192 y 512 px, versión _maskable_), `display: standalone`, caché del _shell_, aviso "Hay una versión nueva" (RF-UX-12). El encabezado muestra el nombre del negocio leído de `mi_perfil()` y su inicial como logo. Runbook `docs/runbooks/cambiar-icono.md` | S      |
| [ ] F3-T10 | Pista de deslizamiento la primera vez (RF-UX-13); estado "Sin conexión" visible                                                                                                                                                                                                                                                                                                                                            | S      |
| [ ] F3-T11 | Primer Playwright smoke: entrar, deslizar por las 6 secciones, salir                                                                                                                                                                                                                                                                                                                                                       | S      |

**Patrón de datos:** TanStack Query con llaves por dominio (`['ventas', filtros]`, `['cuenta', saleId]`, `['productos']`, `['resumen','inicio']`); `staleTime` 30 s; `refetchOnWindowFocus` y `refetchOnReconnect` activos; reintentos solo en lecturas.

**DoD F3:** entrar con `admin@test.local` muestra las 6 secciones con contenido de ejemplo; el Vendedor no ve elementos marcados con `costos.ver`; la app se instala en Android y iPhone desde el navegador; Lighthouse PWA sin errores; Vitest de `lib/` en verde.

### Fase 4 — Vender y clientes (CU-01, CU-02, CU-03)

**Objetivo:** registrar ventas de contado y a pagos de punta a punta, siempre con cliente.

| ID         | Tarea                                                                                                                                                                                                                                                                                                                    | Tamaño |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| [ ] F4-T01 | Catálogo de venta: tarjetas con nombre, precio, "Quedan N"; buscador; chips de categoría; agotados deshabilitados; cada toque suma una unidad sin pasar el stock ("No hay más unidades")                                                                                                                                 | M      |
| [ ] F4-T02 | Carrito en `useReducer` persistido en `sessionStorage` (se conserva si falla la red); barra inferior con artículos, total, "vaciar" y **Cobrar**                                                                                                                                                                         | S      |
| [ ] F4-T03 | Hoja de cobro: resumen con − / +, segmento **De contado / A pagos**, método de pago, botón **Registrar venta** deshabilitado hasta que todo sea válido                                                                                                                                                                   | M      |
| [ ] F4-T04 | `CustomerPicker`: búsqueda con espera de 250 ms vía `buscar_clientes`; coincidencias con teléfono y saldo; **+ Nuevo cliente** en línea (nombre, teléfono, opcionales, casilla de consentimiento WhatsApp); flujo "¿Es la misma persona?" ante `exists`; aviso de cuotas vencidas en ventas a pagos (D-06)               | L      |
| [ ] F4-T05 | Venta a pagos: plazo 1/2/3 meses, prima con teclado numérico y su método; plan en vivo con `lib/installments.ts`; prima ≥ total sugiere "Registrar como contado" (RN-05); `plazo_muy_largo` muestra el mensaje de D-10                                                                                                   | M      |
| [ ] F4-T06 | Envío con `useRpcMutation(registrar_venta)`: `possible_duplicate` → diálogo con la venta existente; `stock_insuficiente` → mensaje con unidades disponibles y refresco del catálogo; `total_cambio` → refresca precios y pide revisar; éxito → toast "Venta #1016 registrada · ₡60 000", vacía carrito y abre el detalle | M      |
| [ ] F4-T07 | Playwright: CU-01, CU-02, CU-03 (cliente nuevo, teléfono repetido), botón deshabilitado sin cliente, doble toque crea una sola venta                                                                                                                                                                                     | M      |

**DoD F4:** una venta de contado y una a pagos se registran en menos de 1 minuto cada una; es imposible guardar sin cliente; los e2e corren en el job smoke.

### Fase 5 — Historial, anulación y cobros (CU-04 a CU-07)

| ID         | Tarea                                                                                                                                                                                                                                                                                                                                                       | Tamaño |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [ ] F5-T01 | Historial: ventas agrupadas por día (Hoy, Ayer, fecha) con total diario; etiqueta Contado / A pagos / Pagada / Vencida / Anulada / Saldo anterior; chips Todas / De contado / A pagos / Anuladas; búsqueda por cliente o folio; carga infinita por cursor                                                                                                   | M      |
| [ ] F5-T02 | Detalle de venta (hoja): cliente y teléfono, vendedor, productos, total; si es a pagos, plan con estados y pagos recibidos; otras compras y saldo total del cliente (RF-CLI-02)                                                                                                                                                                             | M      |
| [ ] F5-T03 | Anular (solo Administrador): motivo (Error de registro / Devolución / Otro + texto), aviso de dinero ya recibido, confirmación "Los productos regresarán al inventario"; `ya_anulada` muestra quién y cuándo                                                                                                                                                | S      |
| [ ] F5-T04 | Filtros de rango de fechas y vendedor (RF-HIS-01, Debería)                                                                                                                                                                                                                                                                                                  | S      |
| [ ] F5-T05 | Por cobrar: tres números (por cobrar, vencido, próximos 7 días); pestañas Pendientes / Liquidadas; lista con barra de avance y próxima fecha; vencidas primero y en rojo                                                                                                                                                                                    | M      |
| [ ] F5-T06 | Cuenta (hoja): plan con estados; monto sugerido (lo vencido o la próxima cuota); botones rápidos **Cuota** y **Todo**; método; **Guardar abono**; "Cuenta liquidada" al llegar a ₡0; **Registrar otro abono** (RF-FB-05)                                                                                                                                    | M      |
| [ ] F5-T07 | Recordatorio: **Enviar recordatorio por WhatsApp** abre `https://wa.me/506XXXXXXXX?text=…` con saludo, nombre del negocio, monto y fecha de la cuota y saldo; al volver pregunta "¿Enviaste el recordatorio?" y solo con Sí llama `registrar_recordatorio` y muestra "Recordatorio enviado hoy" (RF-COB-04); si WhatsApp no abre, ofrece **Copiar mensaje** | S      |
| [ ] F5-T08 | Playwright: CU-04, CU-05 (con y sin abonos; el Vendedor no ve el botón), CU-06 (parcial, total, mayor que el saldo), CU-07 (verifica la URL generada)                                                                                                                                                                                                       | M      |

**Plantilla del recordatorio (`lib/whatsapp.ts`):** "Hola {nombre}, le saluda {negocio}. Le recordamos su cuota de {monto} con fecha {fecha}. Saldo pendiente: {saldo}. ¡Muchas gracias!" — editable por el Administrador más adelante.

**DoD F5:** los abonos actualizan saldo, estados y contadores sin recargar; una venta anulada desaparece de Por cobrar y de los totales y su stock vuelve.

### Fase 6 — Inventario (CU-08 a CU-11)

| ID         | Tarea                                                                                                                                                                                                                                                                                                 | Tamaño |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [ ] F6-T01 | Pestaña **Inventario actual**: total de unidades y valor a precio (y a costo solo con `costos.ver`); lista con nombre, código, precio, unidades y etiqueta OK / Bajo / Agotado; búsqueda por nombre o código; chips de categoría; chip **Stock bajo**                                                 | M      |
| [ ] F6-T02 | Detalle de producto: unidades vendidas, últimos movimientos; accesos "Vender" (agrega al carrito y va a Vender) e "Ingresar stock"                                                                                                                                                                    | S      |
| [ ] F6-T03 | Pestaña **Agregar stock** (solo `inventario.ingresar`): **Producto existente** (selector con unidades actuales, cantidad − / +, costo opcional) y **Producto nuevo** (nombre, categoría, precio, mínimo, cantidad inicial, costo); flujo `similar` → "¿Sumar stock a este?"; lista "Últimos ingresos" | M      |
| [ ] F6-T04 | Editar producto (Administrador): nombre, precio, costo, mínimo, conteo físico, margen por unidad en vivo, aviso no bloqueante si el precio es menor que el costo, **Desactivar** (RF-INV-05); `cambio_concurrente` → "Este producto cambió mientras editabas" y recarga                               | M      |
| [ ] F6-T05 | Playwright: CU-08 a CU-11; el Vendedor no ve costos ni la pestaña Agregar stock, y la API le devuelve 0 filas en `product_costs`                                                                                                                                                                      | M      |

**DoD F6:** cada cambio de stock aparece en movimientos con usuario y fecha; ningún costo llega al navegador de un Vendedor (verificado en la pestaña de red de Playwright).

### Fase 7 — Inicio, perfil y tiempo real (CU-12 a CU-15)

| ID         | Tarea                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Tamaño |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [ ] F7-T01 | Inicio: saludo y cuatro números tocables que llevan a su sección (RF-DSH-01)                                                                                                                                                                                                                                                                                                                                                                                                 | S      |
| [ ] F7-T02 | Pestaña **Actividad**: `activity_log` reciente con ícono, texto, "hace 5 min" y monto; carga infinita                                                                                                                                                                                                                                                                                                                                                                        | S      |
| [ ] F7-T03 | Pestaña **Estado**: `v_alerts` en grupos Urgente / Atención; tocar lleva a la cuenta o producto; "Todo en orden" si no hay                                                                                                                                                                                                                                                                                                                                                   | S      |
| [ ] F7-T04 | Pestaña **Análisis**: 7 / 30 días; cuatro números (ganancia y margen solo Administrador); barras por día contado/pagos, mezcla, top productos, por categoría — portar los gráficos SVG del prototipo v2                                                                                                                                                                                                                                                                      | M      |
| [ ] F7-T05 | Contadores rojos de la barra con `contadores()`                                                                                                                                                                                                                                                                                                                                                                                                                              | S      |
| [ ] F7-T06 | Realtime: un canal por negocio con `postgres_changes` en las tablas de F2-T13; invalidación de llaves de consulta con espera de 300 ms; reconexión al volver la señal                                                                                                                                                                                                                                                                                                        | M      |
| [ ] F7-T07 | Perfil: nombre, rol, permisos en palabras sencillas, ventas 30 días, cambiar contraseña (`auth.updateUser`), cerrar sesión                                                                                                                                                                                                                                                                                                                                                   | S      |
| [ ] F7-T08 | Perfil → Negocio (Administrador): nombre del negocio (se refleja al instante en el encabezado y en los mensajes de WhatsApp, D-19), categorías (con prefijo de código) y métodos de pago                                                                                                                                                                                                                                                                                     | M      |
| [ ] F7-T09 | Perfil → Datos (Administrador): descarga de respaldo `.xlsx` con hojas Ventas, Líneas, Abonos, Clientes, Inventario, Movimientos; librería de Excel cargada solo al tocar el botón                                                                                                                                                                                                                                                                                           | S      |
| [ ] F7-T10 | Perfil → Usuarios (Administrador): lista de solo lectura con nombre, rol y estado; texto "Para agregar personas, contacta a soporte"; runbook `docs/runbooks/crear-usuario.md` con el SQL `private.vincular_usuario(email, rol, nombre)`                                                                                                                                                                                                                                     | S      |
| [ ] F7-T11 | Playwright: CU-12 a CU-15; dos navegadores, una venta en uno actualiza Inicio en el otro en menos de 3 s                                                                                                                                                                                                                                                                                                                                                                     | M      |
| [ ] F7-T12 | Perfil → Datos → **Cargar saldo anterior** (solo `saldos.cargar`, D-12): cliente (con alta rápida de CU-03), fecha de la venta, qué compró (texto), total, cuánto ha pagado, cuotas que faltan (1–3) y fecha de la próxima; vista previa del plan antes de guardar; éxito: "Saldo anterior de Leonor Villalta cargado · ₡20 000 en 2 cuotas"; botón **Cargar otro** para avanzar rápido por el cuaderno; contador "Saldos cargados: 12 · ₡340 000" para cuadrar con el papel | M      |

**DoD F7:** todo el recorrido de los 15 casos de uso pasa en el e2e completo (Chromium y WebKit).

### Fase 8 — Operación: despliegue, respaldos y monitoreo

**Objetivo:** que nada se pierda y que publicar sea un tag. Debe estar lista antes de cargar datos reales.

| ID         | Tarea                                                                                                                                                                                                                                                                                                                          | Tamaño |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| [ ] F8-T01 | `ci.yml` completo: `static`, `unit`, `db` (Supabase local + pgTAP + concurrencia, solo si cambia `supabase/**`), `e2e-smoke` (Chromium, viewport de celular, contra el stack local), vista previa en Pages por PR (`wrangler pages deploy --branch=pr-<n>`) apuntando a staging                                                | M      |
| [ ] F8-T02 | `deploy-staging.yml` (push a `main`): `supabase db push` a staging → build con variables de staging → deploy a Pages rama `staging` → e2e smoke contra staging                                                                                                                                                                 | M      |
| [ ] F8-T03 | `release.yml` (tag `v*.*.*`): e2e completo contra staging → aprobación del Environment `production` → `supabase db push` a prod → build y deploy a producción → smoke de solo lectura en prod                                                                                                                                  | M      |
| [ ] F8-T04 | `nightly.yml`: e2e completo (Chromium + WebKit) contra staging; limpia datos e2e de más de 7 días en staging                                                                                                                                                                                                                   | S      |
| [ ] F8-T05 | `backup.yml` (cada noche, 2:00 CR): `pg_dump --format=custom` de prod con la misma versión mayor que el servidor → cifrar con `age -r $BACKUP_AGE_RECIPIENT` → subir como _release asset_ al repo `inventario-backups` → borrar releases de más de 30 días; si falla, GitHub avisa por correo                                  | M      |
| [ ] F8-T06 | `restore-test.yml` (en el repo de respaldos, semanal): descargar el último → descifrar con la clave privada guardada **solo** en ese repo → `pg_restore` en un servicio Postgres del runner → `scripts/verificar-respaldo.sql` (conteos > 0, stock = Σ movimientos por producto, Σ pagos ≤ total por venta, folios sin huecos) | M      |
| [ ] F8-T07 | Keep-alive: Worker `workers/keepalive` con Cron `0 */6 * * *` que llama `ping()` en prod y staging                                                                                                                                                                                                                             | S      |
| [ ] F8-T08 | `health.yml` diario: llama `ping()` en prod; si falla, el job falla y GitHub avisa por correo                                                                                                                                                                                                                                  | S      |
| [ ] F8-T09 | Sentry en el frontend (D-14): `beforeSend` que elimina nombres, teléfonos y montos; _source maps_ subidos en el release                                                                                                                                                                                                        | S      |
| [ ] F8-T10 | `_headers` de Pages: CSP (solo el propio sitio, Supabase y Sentry), `X-Content-Type-Options`, `Referrer-Policy`, caché larga para `/assets/*`                                                                                                                                                                                  | S      |
| [ ] F8-T11 | Runbooks: `release.md`, `rollback.md` (redeploy del tag anterior; la base se corrige con migración nueva), `restaurar-respaldo.md` (a Supabase o a Neon), `proyecto-pausado.md`                                                                                                                                                | S      |

**Presupuesto de minutos de Actions:** \~60 PRs × 6 min + 30 noches × 10 min + 30 respaldos × 3 min + 30 salud × 0,5 min ≈ 765 min/mes (< 2 000).

**DoD F8:** 7 respaldos nocturnos seguidos exitosos y 1 restauración de prueba en verde; un tag `v0.1.0` llega a producción sin pasos manuales salvo la aprobación.

### Fase 9 — Endurecimiento, datos reales y lanzamiento beta

| ID         | Tarea                                                                                                                                                                                                                                               | Tamaño |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [ ] F9-T01 | Carga del inventario inicial con "Producto nuevo" (CU-10) desde la app. Opcional, si son muchos productos: plantilla CSV y `scripts/importar-productos.ts` que llama `crear_producto` (idempotente; reporta filas rechazadas)                       | S      |
| [ ] F9-T02 | Pasar el cuaderno de deudas al sistema con **Cargar saldo anterior** (F7-T12): ensayo en staging con 3–5 deudas reales, luego en producción; al terminar, los dos Administradores cuadran el total por cobrar de la app contra la suma del cuaderno | M      |
| [ ] F9-T03 | Revisión de UX contra RF-UX-01 a 14 y la tabla 4.1: textos, objetivos táctiles, teclados numéricos, mensajes de error                                                                                                                               | M      |
| [ ] F9-T04 | Rendimiento (RNF-02): Lighthouse móvil con 4G simulado, rendimiento ≥ 90; JS inicial < 250 KB gzip; división por sección; pantallas < 2 s                                                                                                           | S      |
| [ ] F9-T05 | Seguridad: Security y Performance Advisors de Supabase sin alertas; registro público desactivado en prod; solo clave pública en el bundle (búsqueda en CI); revisión de RLS con el Vendedor real                                                    | S      |
| [ ] F9-T06 | Privacidad (RNF-06, Ley 8968): aviso breve de uso de datos en Perfil; consentimiento de WhatsApp registrado; Sentry sin datos personales                                                                                                            | S      |
| [ ] F9-T07 | Bootstrap de producción: `bootstrap/prod.sql`, nombre del negocio desde Perfil → Negocio, crear los 3 usuarios reales (2 Administradores, 1 Vendedor; runbook), cargar productos y saldos, verificar totales con la familia                         | S      |
| [ ] F9-T08 | Prueba con la familia: guion con los 15 casos de uso; medir RNF-01 (primera venta < 5 min sin ayuda); registrar hallazgos como _issues_                                                                                                             | M      |
| [ ] F9-T09 | Corregir hallazgos P1/P2; tag `v0.9.0-beta`; anuncio interno                                                                                                                                                                                        | M      |

**Criterios para declarar la beta lanzada:**

- [ ] Los 15 casos de uso pasan en el e2e completo en staging.
- [ ] Producción con datos reales de inventario; las deudas del cuaderno cargadas y el total por cobrar cuadrado contra el papel.
- [ ] Los 3 usuarios (2 Administradores, 1 Vendedor) usaron la app en un día real de ventas; el Vendedor no vio costos ni ganancias.
- [ ] 7 respaldos nocturnos seguidos y 1 restauración de prueba exitosos.
- [ ] Una persona sin experiencia registra su primera venta en menos de 5 minutos.
- [ ] Sin errores P1 abiertos; Sentry sin errores nuevos en 48 h de uso real.

**Criterios para pasar de beta a v1.0 (referencia):** 30 días de uso real sin pérdida de datos; F10 terminada y probada en una feria; decisión D-17 tomada; preguntas abiertas de 7.2 respondidas; pantalla de usuarios (CU-15 completo); bloqueo tras 5 intentos y teléfono + PIN (D-18).

### Fase 10 — Modo sin conexión (primera fase después de la beta)

**Objetivo:** vender, cobrar abonos y registrar clientes en ferias y visitas sin señal, y que todo se sincronice solo al volver la conexión, sin duplicados ni pérdidas. Empieza en cuanto la beta esté estable; por eso F1–F7 ya dejan el modelo preparado (sección 6).

**Alcance sin conexión:** Vender (CU-01, CU-02), crear cliente (CU-03), registrar abono (CU-06), consultar inventario, clientes y cuentas con los datos guardados en el celular. **Solo con conexión:** anular, ingresar o editar stock, crear productos, configuración, análisis.

| ID          | Tarea                                                                                                                                                                                                                                                 | Tamaño |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| [ ] F10-T01 | Cerrar las reglas de conflicto (abajo) con la familia y escribir el ADR                                                                                                                                                                               | S      |
| [ ] F10-T02 | Caché persistente en IndexedDB: productos y precios, clientes con saldos, cuentas abiertas, métodos de pago (`persistQueryClient` de TanStack Query); botón "Preparar para feria" que descarga todo y muestra la hora de la última actualización      | M      |
| [ ] F10-T03 | Cola de envíos en IndexedDB debajo de `useRpcMutation`: cada operación guarda `id`, llave de idempotencia, `client_created_at` y su carga; se envían en orden al volver la señal (evento `online`, al abrir la app y con botón **Enviar pendientes**) | L      |
| [ ] F10-T04 | Interfaz sin conexión: banner "Sin conexión · 3 ventas por enviar"; ventas pendientes con folio provisional ("Pendiente") que se reemplaza por el folio real al sincronizar; stock y saldos calculados localmente con lo pendiente                    | M      |
| [ ] F10-T05 | Ajustes en la base: modo `p_offline` en `registrar_venta` y `registrar_abono` que aplica las reglas de conflicto; conflictos registrados en una tabla `sync_issues` visible para el Administrador en Inicio → Estado                                  | M      |
| [ ] F10-T06 | Sesión: renovar el token al volver la señal; si expiró, conservar la cola y pedir entrar de nuevo sin perder nada                                                                                                                                     | S      |
| [ ] F10-T07 | Pruebas: Playwright con `context.setOffline(true)` (vender, abonar, crear cliente, volver en línea, verificar folios y saldos); dos celulares sin conexión vendiendo la última unidad; reintentos repetidos sin duplicados                            | M      |

**Reglas de conflicto (propuesta, se cierran en F10-T01):**

| Caso                                                                           | Propuesta                                                                                                                               |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Venta sin conexión de un producto que ya no tiene stock al sincronizar         | Se acepta (el producto ya se entregó); el stock queda en 0 con un ajuste automático y una alerta "Revisar conteo" para el Administrador |
| El precio cambió mientras se vendía sin conexión                               | Se respeta el precio que vio el cliente (RN-16)                                                                                         |
| Cliente creado sin conexión con un teléfono que ya existe                      | Se une al cliente existente y la venta queda a su nombre; aviso al Administrador                                                        |
| Abono sin conexión que supera el saldo al sincronizar (otro abono llegó antes) | Se guarda hasta el saldo y el excedente queda en `sync_issues` para resolverlo con el cliente                                           |
| Venta a pagos sin conexión                                                     | Se permite; el plan se calcula en el celular con la misma tabla de casos y la base lo recalcula al recibirla                            |

**DoD F10:** una jornada simulada de feria (20 ventas, 5 abonos, 3 clientes nuevos sin conexión en dos celulares) se sincroniza sin duplicados, con folios consecutivos y saldos correctos; los conflictos aparecen en Estado.

## 8. Matriz de trazabilidad

| Requerimiento                           | Base de datos                              | Interfaz          | Pruebas                   |
| --------------------------------------- | ------------------------------------------ | ----------------- | ------------------------- |
| RN-01 cliente obligatorio               | F1 `sales.customer_id NOT NULL`, F2-T03    | F4-T03/T04        | pgTAP, e2e F4             |
| RN-02 no vender sin stock               | F1 `CHECK stock >= 0`, F2-T03 pasos 5 y 11 | F4-T01            | concurrencia F2-T12       |
| RN-03/04 plazos y cuotas                | F2-T01                                     | F3-T08, F4-T05    | `installments.cases.json` |
| RN-05 prima                             | F1 CHECK, F2-T03                           | F4-T05            | pgTAP                     |
| RN-06/07/08 abonos, vencidas, liquidada | F2-T05, F2-T10                             | F5-T05/T06        | pgTAP, e2e F5             |
| RN-09/11 anulación y stock              | F2-T06                                     | F5-T03            | pgTAP, concurrencia       |
| RN-10 stock bajo                        | F2-T10                                     | F6-T01, F7-T03    | pgTAP                     |
| RN-12 nada se borra                     | F1-T08                                     | —                 | pgTAP                     |
| RN-13 colones enteros                   | F1 tipos                                   | F3-T08 `money.ts` | Vitest                    |
| RN-14 métodos de pago                   | F1 `payment_methods`                       | F7-T08            | e2e                       |
| RN-15 folio                             | F2-T03 paso 9                              | —                 | concurrencia              |
| RN-16 precio al momento                 | F1 `sale_items`, `sale_item_costs`         | —                 | pgTAP                     |
| RN-17 toda acción responde              | —                                          | F3-T06/T07        | e2e                       |
| RN-18 duplicados                        | F1 `UNIQUE idempotency_key`, F2 (todas)    | F3-T07            | concurrencia, e2e F4      |
| RF-ROL-01..03                           | F1-T02/T07                                 | F3-T05            | pgTAP RLS                 |
| RNF-04 datos compartidos                | F2-T13                                     | F7-T06            | e2e dos navegadores       |
| RNF-07 respaldo                         | —                                          | F7-T09            | F8-T05/T06                |
| Deudas anteriores en papel (D-12)       | F2-T14                                     | F7-T12            | pgTAP, e2e F7             |
| Sin conexión (D-05)                     | F1 `client_created_at`, `p_id`; F10-T05    | F10-T02 a T04     | F10-T07                   |

## 9. Riesgos de implementación

| Riesgo                                             | Señal                                      | Mitigación                                                                                                            |
| -------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Lógica duplicada entre SQL y TS diverge            | Vista previa de cuotas ≠ plan guardado     | Tabla de casos compartida; la UI siempre muestra el plan devuelto por la base tras guardar                            |
| RPC `SECURITY DEFINER` sin chequeo de permiso      | Un Vendedor logra anular                   | Prueba de catálogo que exige `require_perm` en cada función pública                                                   |
| Supabase se pausa en staging (menos uso)           | Falla deploy o nightly                     | Keep-alive también en staging; runbook de reactivación                                                                |
| Migración rompe producción                         | Falla `db push` en release                 | Siempre pasa antes por staging con e2e; solo hacia adelante                                                           |
| Claude Code se sale del alcance de la fase         | PRs grandes con cambios no pedidos         | Un plan por fase, PRs pequeños, `CLAUDE.md` con reglas y referencia a este roadmap                                    |
| Datos reales con formatos inconsistentes           | Importación rechaza filas                  | Scripts idempotentes con reporte de filas rechazadas; correr primero en staging                                       |
| Zona horaria mal calculada                         | "Hoy" o vencidas desfasadas por la noche   | Toda fecha de negocio se calcula en la base con la zona del negocio; pruebas con hora 23:30 CR                        |
| Errores al pasar el cuaderno a la app              | El total por cobrar no cuadra con el papel | Ensayo en staging; contador de saldos cargados; cuadre con los dos Administradores antes del lanzamiento              |
| Una decisión de F1–F7 bloquea el modo sin conexión | F10 obliga a cambiar tablas o pantallas    | Reglas de la sección 6 (ids del celular, `client_created_at`, una sola capa de envío); revisarlas en cada PR de F1–F7 |

## 10. Respuestas recibidas y preguntas pendientes

Respuestas del 2 nov 2026, ya aplicadas en este documento:

| Pregunta                                               | Respuesta                                                   | Dónde se aplicó                                |
| ------------------------------------------------------ | ----------------------------------------------------------- | ---------------------------------------------- |
| ¿Hay ferias o visitas sin señal?                       | Sí, en el futuro; muy importante                            | D-05, sección 6, F10                           |
| ¿Cuántas personas usarán la beta y con qué rol?        | Al menos 3: 2 Administradores y 1 Vendedor                  | D-18, F1-T10, F9-T07, criterios de lanzamiento |
| ¿Hay deudas de clientes que importar y en qué formato? | Sí, en papel (cuaderno)                                     | D-12, F2-T14, F7-T12, F9-T02                   |
| ¿Se mantiene el nombre actual del negocio y su ícono?  | El nombre debe ser editable; el ícono cambiará más adelante | D-19, F3-T09, F7-T08                           |
| ¿El bloqueo tras 5 intentos de CU-14 entra en la beta? | No, queda para después de la beta                           | D-18, criterios de v1.0                        |

Pendientes:

- [ ] Reglas de conflicto sin conexión (tabla de F10); conviene acordarlas antes de empezar F10.
- [ ] Preguntas abiertas de la sección 7.2 del documento funcional que siguen con valor asumido (D-06, D-07, D-08).
