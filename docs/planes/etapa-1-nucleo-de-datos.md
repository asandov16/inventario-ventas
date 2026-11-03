# Plan — Etapa 1: Núcleo de datos (F1 + F2)

## 1. Contexto

La Etapa 0 dejó el repo, las herramientas, las cuentas y el CI listos. Ver la revisión del DoD, cerrada con el PR #5.

La Etapa 1 construye la **base de datos completa**: 19 tablas, seguridad por rol y todas las reglas de negocio como funciones transaccionales. Todo corre en el **Supabase local**: no se toca staging ni producción y no se construyen pantallas.

**Al terminar** se podría operar el negocio solo con llamadas a la base: vender de contado y a pagos, cobrar, anular, ingresar stock y cargar saldos anteriores. Cada regla RN-01 a RN-18 queda probada con pruebas automáticas.

Este plan se guarda en el repo como `docs/planes/etapa-1-nucleo-de-datos.md`.

## 2. Entregas: 3 PRs

```
 PR 1  Modelo y seguridad (F1)        PR 2  Ventas y cobros (F2)           PR 3  Inventario y lecturas (F2)
 ─────────────────────────────        ─────────────────────────────        ─────────────────────────────
 19 tablas, roles, permisos           calc_installments + casos JSON        create/restock/update_product
 RLS, triggers, índices               vistas de cuentas y saldos            record_reminder, configuración
 seed local + bootstrap prod          clientes (crear/buscar)               vistas de stock y alertas
 pgTAP: esquema, RLS, borrado         register_sale / register_payment      lecturas agregadas (inicio,
 job "db" en CI + tipos sin drift     void_sale / register_legacy_balance   cobros, análisis, exportar)
                                      pgTAP por regla                       Realtime, concurrencia,
                                                                            prueba de catálogo, demo
        │                                     │                                     │
        └──── cada PR: CI verde + tu merge ───┴──── al final: revisión del DoD ─────┘
```

| PR  | Tareas del roadmap                                  | Rama                           |
| --- | --------------------------------------------------- | ------------------------------ |
| 1   | F1-T01 a F1-T12                                     | `feat/stage-1-data-model`      |
| 2   | F2-T01 a F2-T06, F2-T10 (vistas de cuentas), F2-T14 | `feat/stage-1-sales-rules`     |
| 3   | F2-T07 a F2-T13                                     | `feat/stage-1-inventory-reads` |

## 3. Modelo de datos

```
 businesses ─┬─< profiles >── roles ──< role_permissions >── permissions
             ├─< categories ──< products ──1:1── product_costs
             │                    │  └──< inventory_movements
             ├─< payment_methods  │
             ├─< customers ──< sales ──< sale_items ──1:1── sale_item_costs
             │                    ├──< installments
             │                    ├──< payments
             │                    └──< reminders >── notification_outbox
             └─< activity_log
```

Columnas según el roadmap (F1, resumen DDL), con estas reglas comunes:

- `id uuid` por defecto.
- `business_id` en toda tabla de negocio.
- `created_at timestamptz`.
- Dinero en `int` con `CHECK`.
- Teléfonos en E.164.

**Valores en inglés** (ADR-027), siempre `text` con `CHECK`:

| Columna                      | Valores                                            |
| ---------------------------- | -------------------------------------------------- |
| `sales.type`                 | `cash`, `installments`                             |
| `sales.source`               | `app`, `legacy_import`                             |
| `payments.kind`              | `cash`, `down_payment`, `payment`, `legacy`        |
| `inventory_movements.type`   | `initial`, `restock`, `sale`, `void`, `adjustment` |
| `reminders.channel`          | `whatsapp_link`, `whatsapp_api`                    |
| `notification_outbox.status` | `open`, `pending`, `sent`, `failed`                |
| Roles                        | `admin`, `seller`                                  |

Permisos: los 16 del glosario (`sales.create`, `costs.read`…).

**Migraciones**, creadas con `supabase migration new` (ADR-029):

| #   | Nombre                       | Contenido                                                               |
| --- | ---------------------------- | ----------------------------------------------------------------------- |
| 1   | `extensions_and_schemas`     | Esquema `private`, `pg_trgm`, `unaccent`, utilidades de trigger         |
| 2   | `tenancy_and_auth`           | `businesses`, `permissions`, `roles`, `role_permissions`, `profiles`    |
| 3   | `catalogs`                   | `categories`, `payment_methods`, `customers`                            |
| 4   | `inventory`                  | `products`, `product_costs`, `inventory_movements`                      |
| 5   | `sales`                      | `sales`, `sale_items`, `sale_item_costs`, `installments`, `payments`    |
| 6   | `notifications_and_activity` | `reminders`, `notification_outbox`, `activity_log`                      |
| 7   | `security`                   | Permisos de acceso, funciones de permisos, políticas RLS                |
| 8   | `triggers_and_indexes`       | Inmutabilidad, no borrar, `updated_at`, último admin, bitácora; índices |

Las RPC de los PR 2 y 3 llegan en migraciones nuevas; nunca se edita una ya fusionada.

## 4. Seguridad

1. **Permisos de acceso cerrados por defecto.** Supabase da `ALL` a `anon` y `authenticated` sobre `public`. Se revoca todo, también en `ALTER DEFAULT PRIVILEGES`, y luego:
   - `authenticated` recibe **solo `SELECT`** en tablas y vistas legibles.
   - `anon` no recibe nada.
2. **Funciones de seguridad en `private`**, `STABLE SECURITY DEFINER`:
   - `current_business_id()` y `has_permission(code)`: un usuario inactivo obtiene `NULL` y no ve nada.
   - `require_permission(code)` lanza `permission_denied`.
3. **RLS en las 19 tablas.**
   - Lectura: `business_id = private.current_business_id()`.
   - Tablas hijas: por la venta o el producto padre.
   - `product_costs` y `sale_item_costs` además exigen `has_permission('costs.read')`.
   - Sin políticas de escritura.
4. **RPC:** `SECURITY DEFINER`, `search_path = ''`, `require_permission` al inicio, `REVOKE` de `public` y `anon`, `GRANT` a `authenticated`. Excepciones: solo `ping` y `get_my_profile` (ADR-023).
5. **Triggers.**
   - `prevent_delete` en todas las tablas transaccionales.
   - `sales`: solo cambian las columnas de anulación, una vez.
   - `payments`, `inventory_movements` y `activity_log`: inmutables.
   - Siempre debe quedar un admin activo.
6. **Vistas** con `security_invoker = true`, para que respeten RLS.

## 5. Funciones (RPC)

Todas retornan `jsonb` con `status`. Las de crear reciben `p_idempotency_key`; las que el modo sin conexión necesita también `p_id` y `p_client_created_at` (D-05).

| RPC                                                                                                                                   | Permiso                  | Reglas clave                                                                               | PR  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------ | --- |
| `private.calc_installments`                                                                                                           | —                        | RN-03/04, D-09, D-10; `first_due` para saldos anteriores                                   | 2   |
| `create_customer`, `update_customer`                                                                                                  | `customers.edit`         | Teléfono a E.164; `exists` si ya está                                                      | 2   |
| `search_customers(q)`                                                                                                                 | `sales.read`             | Nombre sin tildes o dígitos; trae saldo y vencido                                          | 2   |
| `register_sale`                                                                                                                       | `sales.create`           | Los 12 pasos del roadmap F2-T03, en orden; bloqueo `FOR UPDATE` ordenado; folio sin huecos | 2   |
| `register_payment`                                                                                                                    | `payments.create`        | Bloquea la venta; abono ≤ saldo; duplicado en 10 min                                       | 2   |
| `void_sale(reason)`                                                                                                                   | `sales.void`             | Solo una vez (`already_voided` con quién y cuándo); devuelve stock                         | 2   |
| `register_legacy_balance`                                                                                                             | `legacy_balances.import` | `source = 'legacy_import'`, pago `legacy`, cuotas desde `first_due`; sin stock             | 2   |
| `create_product`                                                                                                                      | `inventory.restock`      | `similar` si el nombre se parece (> 0.6); código `PER-007`                                 | 3   |
| `restock_product`                                                                                                                     | `inventory.restock`      | Movimiento `restock`; costo opcional; duplicado                                            | 3   |
| `update_product`                                                                                                                      | `products.edit`          | Bloqueo optimista (`concurrent_update`); ajuste de conteo; desactivar                      | 3   |
| `record_reminder`                                                                                                                     | `reminders.send`         | Registra el recordatorio y la fila en `notification_outbox` (`open`)                       | 3   |
| `update_business`, `save_category`, `save_payment_method`                                                                             | `business.configure`     | Configuración                                                                              | 3   |
| `get_my_profile`, `ping`                                                                                                              | excepción                | Perfil y permisos / salud                                                                  | 1   |
| `get_dashboard_summary`, `get_receivables_summary`, `get_inventory_summary`, `get_badge_counts`, `get_analytics(days)`, `export_data` | según roadmap F2-T11     | Ganancia y costos solo con permiso                                                         | 3   |

**Vistas:**

| Vista                  | Para qué                                           | PR  |
| ---------------------- | -------------------------------------------------- | --- |
| `v_installment_status` | Estado de cada cuota, con la corrección de ADR-022 | 2   |
| `v_sale_accounts`      | Saldo, estado y próxima cuota de cada venta        | 2   |
| `v_customer_balances`  | Saldo y vencido por cliente                        | 2   |
| `v_products_status`    | `ok` / `low` / `out`                               | 3   |
| `v_alerts`             | Alertas para Inicio → Estado                       | 3   |
| `v_sales_list`         | Historial con paginación por cursor                | 3   |

"Hoy" se calcula con `private.business_today()`, en la zona del negocio. Las ventas anuladas quedan fuera de saldos, alertas y totales.

**Errores:** `RAISE ... ERRCODE 'P0001', MESSAGE '<code>', DETAIL '<json>'`, con los 13 códigos del glosario. `errors.ts` llega en la Etapa 2.

## 6. Datos de prueba

- **`supabase/seed.sql`, solo local y CI:**
  - Negocio "Mi Negocio", catálogos, y los 10 productos, 15 clientes y ventas del prototipo, con nombres ficticios.
  - Usuarios `admin@test.local`, `admin2@test.local` y `vendedor@test.local`, con una contraseña de desarrollo documentada.
  - `supabase db push` **no** ejecuta el seed, así que estos usuarios nunca llegan a staging ni a producción. Los usuarios de staging se crean en la Etapa 4 con contraseñas secretas.
- **`supabase/bootstrap/prod.sql`:** roles, permisos y catálogos, sin marca ni usuarios.
- **`private.link_user(email, role, name)`:** vincula un usuario de Auth con su perfil. Lo usan el seed y el runbook futuro de crear usuarios.

## 7. Pruebas

| Tipo                | Dónde                                                                                          | Qué cubre                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ayudantes pgTAP     | `supabase/tests/000_setup.sql`                                                                 | `tests.authenticate_as(email)` / `tests.clear_authentication()`. Solo existen en la base local de pruebas, nunca en migraciones                             |
| Esquema y seguridad | `00_schema`, `10_rls`, `11_no_delete`, `12_last_admin`                                         | Lo pedido en el roadmap F1. Ejemplos: el Vendedor no lee costos; otro negocio ve 0 filas; nadie inserta directo; `DELETE` falla incluso como `postgres`     |
| Cuotas              | `20_calc_installments.sql`                                                                     | Generado desde `shared/fixtures/installments.cases.json` por `scripts/gen-installments-pgtap.ts`. El CI falla si el archivo generado no coincide            |
| Reglas              | `30_register_sale`, `31_register_payment`, `32_void_sale`, `33_legacy_balance`, `40_products`… | Un caso feliz y uno de rechazo por cada regla, incluido el caso de ADR-022                                                                                  |
| Catálogo de RPC     | `90_rpc_catalog.sql`                                                                           | Recorre las funciones de `public`: exige `SECURITY DEFINER`, `search_path` vacío, `require_permission` y sin `anon`. Solo admite las excepciones de ADR-023 |
| Concurrencia        | `supabase/tests/concurrency/*.test.ts` (Vitest + `pg`)                                         | Los 5 escenarios del roadmap F2-T12: última unidad, misma llave en paralelo, 20 folios seguidos, doble anulación, abonos que juntos superan el saldo        |

**CI**, nuevo job `db`, solo si cambia `supabase/**` o `shared/fixtures/**`:

1. `supabase start` sin servicios innecesarios.
2. `supabase test db`.
3. Pruebas de concurrencia.
4. `supabase db lint`.
5. Tipos regenerados sin diferencias.
6. Archivo de cuotas sin diferencias.

Se suma al check `ci` requerido.

**Scripts nuevos:** `pnpm test:db`, `pnpm gen:installment-tests` y `pnpm db:demo`. La demo es un recorrido narrado en español: venta a pagos, abono, anulación, y el Vendedor que no ve costos.

**Dependencias nuevas** (versión exacta): `pg`, `@types/pg` y la acción `supabase/setup-cli`, fijada por SHA.

## 8. Decisiones nuevas (ADRs)

| ADR | Decisión                                                                               |
| --- | -------------------------------------------------------------------------------------- |
| 031 | Valores de estado y tipos en inglés; tabla de equivalencias en el glosario             |
| 032 | Permisos cerrados por defecto: revocar los privilegios que Supabase da por omisión     |
| 033 | Usuarios de prueba solo en el seed local; staging nunca recibe el seed                 |
| 034 | Casos de cuotas: el JSON genera el SQL de pgTAP, con verificación de diferencias en CI |
| 035 | Ayudantes de pgTAP fuera de las migraciones                                            |

## 9. DoD de la Etapa 1

- **PR 1:** `pnpm db:reset` aplica todo y carga el seed; `pnpm db:test` y `supabase db lint` limpios; tipos sin diferencias; el job `db` corre en CI.
- **PRs 2 y 3:** pgTAP cubre cada regla RN-01 a RN-18 aplicable en la base, con un caso feliz y uno de rechazo; concurrencia en verde; la prueba de catálogo falla si una RPC no verifica permisos.
- **Al cierre:** revisión formal del DoD (como en la Etapa 0), `pnpm db:demo` en vivo contigo y casillas F1 y F2 marcadas en el roadmap.

## 10. Riesgos

| Riesgo                               | Mitigación                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------- |
| RLS mal escrita filtra costos        | Pruebas con el Vendedor sobre cada tabla y vista de costos; vistas con `security_invoker` |
| Cuota calculada distinto en SQL y TS | Un solo JSON de casos; el SQL de pruebas se genera desde él                               |
| Bloqueos cruzados entre ventas       | Bloqueo de productos en orden fijo por `id`; prueba de 20 ventas en paralelo              |
| "Hoy" desfasado de noche             | Todo vencimiento usa la zona del negocio; prueba con hora 23:30 de Costa Rica             |
| OrbStack vence (2 dic)               | Cambiar a Docker Desktop; el proyecto no cambia                                           |

## 11. Verificación

Local, después de cada PR:

```
pnpm db:reset
pnpm db:test
pnpm test:db
pnpm check
pnpm gen:types && git diff --exit-code
```

- **CI:** `secret-scan`, `static`, `unit`, `db` y `ci` en verde.
- **Al final:** `pnpm db:demo` muestra el recorrido completo, y una consulta como Vendedor a `product_costs` devuelve 0 filas.
