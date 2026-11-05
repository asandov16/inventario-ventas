# Plan — Etapa 2: App y Vender (F3 + F4)

## 1. Contexto

Las etapas 0 y 1 dejaron el repo, el CI y la base de datos completa con todas las reglas probadas. Todavía **no hay interfaz**: `pnpm dev:web` muestra solo una página "en construcción", y lo construido hasta hoy se ve únicamente con `pnpm db:demo`.

La Etapa 2 construye la app:

- **F3:** el esqueleto con 6 secciones, sesión, permisos, respuestas visibles y PWA.
- **F4:** la pantalla **Vender** de punta a punta, de contado y a pagos, siempre con cliente.

**Al terminar** harás una venta real de prueba desde tu celular, con la app instalada.

**Decisión tomada:** la prueba en el celular corre en un **entorno de staging** con HTTPS:

- Cloudflare `inv-web` publica una vista previa por PR.
- `inv-staging` recibe las migraciones y usuarios de prueba con contraseñas secretas.
- Solo se usan datos ficticios.

Esto adelanta una parte de la Etapa 4. **Desde el PR 2, cada PR trae un enlace que puedes abrir en el celular.**

El plan se guarda en el repo como `docs/planes/etapa-2-app-y-vender.md`.

## 2. Entregas: 6 PRs

```
 PR 1 Esqueleto      PR 2 Staging        PR 3 Sesión y       PR 4 PWA y          PR 5 Catálogo       PR 6 Cobro y
 de la app           y vista previa      respuestas          prueba E2E          y carrito           cliente
 ───────────────     ───────────────     ───────────────     ───────────────     ───────────────     ───────────────
 router, Track,      build en CI,        entrar/salir,       instalable,         tarjetas, buscar,   CustomerPicker,
 TabBar, Sheet,      vista previa por    perfil, permisos,   aviso de versión,   chips, carrito,     cuotas en vivo,
 dinero, teléfono,   PR, migraciones a   Toast, Dialog,      "Sin conexión",     hoja de cobro       registrar venta,
 fechas, cuotas TS   staging, usuarios   useRpcMutation,     Playwright smoke                        E2E CU-01..03
                     de prueba           errors.ts           en CI
   │                    │ ← desde aquí: enlace para el celular en cada PR                               │
   └──────────── cada PR: CI verde + tu merge ─────────── al final: revisión del DoD + venta en tu celular ┘
```

| PR  | Tareas del roadmap                                | Rama                            |
| --- | ------------------------------------------------- | ------------------------------- |
| 1   | F3-T01, T02, T03, T04, T08                        | `feat/stage-2-app-shell`        |
| 2   | Parte de F8: vista previa y migraciones a staging | `ci/stage-2-staging-preview`    |
| 3   | F3-T05, T06, T07                                  | `feat/stage-2-session-feedback` |
| 4   | F3-T09, T10, T11                                  | `feat/stage-2-pwa-e2e`          |
| 5   | F4-T01, T02, T03                                  | `feat/stage-2-sales-catalog`    |
| 6   | F4-T04, T05, T06, T07                             | `feat/stage-2-sales-checkout`   |

**No se esperan cambios de SQL:** las RPC y vistas de la Etapa 1 cubren todo.

- `register_sale` ya valida el total con `p_expected_total` (`total_changed`).
- `search_customers` y `create_customer` ya existen y devuelven `exists`.
- `get_my_profile` y `v_products_status` ya existen.

Si aparece una brecha, va en una migración nueva con su pgTAP.

## 3. Estructura del frontend (ADR-028)

```
web/src/
  app/            main.tsx, providers.tsx (QueryClient, Router), routes.tsx,
                  AuthGate.tsx, AppShell.tsx (Header + Track + TabBar), Track.tsx, TabBar.tsx
  features/
    session/      login, perfil cargado con get_my_profile, cerrar sesión
    sales/        Vender: catálogo, carrito, hoja de cobro, plan de cuotas, registrar
      domain/cart.ts           reductor puro del carrito (probado con Vitest)
      api/salesRepository.ts   v_products_status, payment_methods, register_sale (Zod)
      hooks/useCatalog, useCart, useRegisterSale
      components/Catalog, ProductCard, CartBar, CheckoutSheet, InstallmentPlan, SaleDoneSheet
    customers/    CustomerPicker + NewCustomerForm; expone CustomerPicker en index.ts
    home/ history/ receivables/ inventory/ profile/   marcadores con contenido de ejemplo
  shared/
    ui/      Button, BusyButton, Sheet, Dialog, Toast, Banner, FieldError, ErrorState,
             Empty, Chip, Segmented, Can
    hooks/   usePermission, useOnlineStatus, useUnsavedChangesGuard
    api/     supabaseClient, useRpcMutation, errors.ts, queryKeys.ts, database.types.ts
    domain/  money, phone, dates, installments, whatsapp (+ pruebas)
```

**Reglas clave:**

- Solo `shared/api` importa `supabase-js`, y ESLint lo verifica.
- Los componentes usan hooks, nunca repositorios.
- Las cuotas en TS son solo vista previa. Después de guardar se muestra el plan que devuelve la base.

## 4. Decisiones de diseño

| Tema                | Decisión                                                                                                                                                                                                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rutas               | `react-router`, rutas por ruta (`/vender`), no por `#`. Las hojas se abren por parámetro (`?venta=<id>`, `?cobrar=1`) para que "atrás" las cierre                                                                                                                                                    |
| Track               | `scroll-snap` como en el prototipo (`.track` / `.panel`). Deslizar cambia la ruta con `replace`; tocar una pestaña desplaza. Flechas en escritorio salvo dentro de un campo o una hoja                                                                                                               |
| Datos               | TanStack Query v5: `staleTime` 30 s, refresco al volver a la ventana y al reconectar, reintentos solo en lecturas. Llaves en `queryKeys.ts`                                                                                                                                                          |
| Escrituras          | Solo por `useRpcMutation`: llave `crypto.randomUUID()` en el primer intento, reutilizada al reintentar y descartada tras éxito. Maneja `possible_duplicate`, `exists` y `similar` con diálogo, traduce errores con `errors.ts`, invalida consultas y muestra el toast                                |
| Errores             | `errors.ts` traduce cada código de la Etapa 1 a un mensaje en español que dice qué hacer, usando el DETAIL (p. ej. "Solo quedan 2 de Rosa Imperial; ajusta la cantidad"). Error desconocido o de red: "No se pudo guardar. Revisa tu internet y toca Reintentar." La tabla también va en el glosario |
| Fechas              | `Intl.DateTimeFormat` con `timeZone: 'America/Costa_Rica'`, sin `date-fns` (una dependencia menos)                                                                                                                                                                                                   |
| Cuotas TS           | `shared/domain/installments.ts` replica `calc_installments`: piso a ₡100, el resto en la última cuota y fin de mes ajustado (ADR-009). Se prueba con el **mismo** `installments.cases.json` que pgTAP                                                                                                |
| Copia               | Toda en `messages.es.ts`, tomada del prototipo v2 y de la sección 4.1. "Quedan N" en las tarjetas, como dice el roadmap y la regla de la casa (el prototipo decía "Disponibles")                                                                                                                     |
| Tipo de venta       | Dos tarjetas grandes "De contado / A pagos", como en el prototipo                                                                                                                                                                                                                                    |
| Respuestas          | Toast arriba (no tapa botones): éxito 4,5 s, error 5 s, `aria-live`. Banner y FieldError (enfoca y desplaza). Dialog con `role=alertdialog`. BusyButton. ErrorState con **Reintentar**. "¿Descartar cambios?" al cerrar un formulario con cambios                                                    |
| Carrito             | Reductor puro en `domain/cart.ts`, guardado en `sessionStorage`: se conserva si falla la red. Nunca supera el stock visible ("No hay más unidades de …")                                                                                                                                             |
| Cliente             | Búsqueda con espera de 250 ms. Desde 2 letras o 3 dígitos, que es lo que acepta `search_customers`. Ante `exists`: "Ese teléfono ya está registrado… ¿Es la misma persona?". Aviso D-06 si el cliente tiene vencido en una venta a pagos                                                             |
| Detalle tras vender | Hoja `?venta=<id>` con lo que devolvió la base: folio, total, método, cliente y plan de cuotas. El detalle completo llega en la Etapa 3                                                                                                                                                              |

## 5. Staging y vista previa (PR 2)

**Lo que haces tú (unos 10 min, con runbook):**

1. Cloudflare → Workers & Pages → crear el proyecto **Pages** `inv-web` con "Direct Upload". Así se evita el problema de `wrangler` en la raíz del workspace.
2. Supabase `inv-staging` → Authentication → crear 2 usuarios: un Admin y un Vendedor, con correos de prueba y contraseñas que guardas tú.

**Lo que hace el CI:**

- **Job `build`** en todo PR web: corre `pnpm build`. Hoy el CI no construye la app.
- **Job `preview`**, solo en PRs del propio repo (nunca `pull_request_target`):
  - publica `web/dist` con `wrangler pages deploy` en el entorno `staging`;
  - usa la URL y la llave anónima de staging, que ya están en los secretos;
  - comenta el enlace en el PR.
- **Job `migrate-staging`**, al hacer merge a `main` y con el entorno `staging`:
  - `supabase db push` a `inv-staging`;
  - no ejecuta el seed (ADR-033).

**Datos de staging:**

- `supabase/bootstrap/prod.sql` crea negocio, roles y catálogos.
- `supabase/bootstrap/staging-demo.sql` carga productos y clientes ficticios (teléfonos 8000-00NN) mediante las RPC.
- Ambos se corren una vez con el runbook nuevo `docs/runbooks/staging.md`. `private.link_user` vincula a los 2 usuarios.

**Seguridad:**

- Mismas reglas del repo público.
- La vista previa es pública en internet, pero solo tiene datos ficticios y pide sesión.
- Ningún secreto se imprime en los logs.
- Las acciones se fijan por SHA.

## 6. PWA y pruebas

**PWA (PR 4):**

- `vite-plugin-pwa` con manifest y nombre tomado de `VITE_APP_NAME` (D-19).
- Íconos provisionales con la inicial sobre `--brand`: 192 px, 512 px y versión _maskable_.
- `display: standalone`.
- Caché del esqueleto de la app.
- Aviso "Hay una versión nueva" con botón **Actualizar**.

**Ajuste al DoD:** Lighthouse ya no tiene categoría PWA. El DoD "Lighthouse PWA sin errores" se cambia por:

- Playwright verifica que el manifest es válido y que el service worker queda activo;
- instalación real en Android y en iPhone desde la vista previa.

**Pruebas:**

| Tipo                          | Qué cubre                                                                                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vitest (`shared/domain`)      | Dinero `₡38 000`, teléfonos `8000-0001` ↔ `+50680000001`, "Hoy/Ayer" en zona CR, cuotas con el JSON compartido, enlace de WhatsApp                                     |
| Vitest (reductores y gateway) | Carrito (no pasa el stock, vaciar, persistencia) y `useRpcMutation` (llave reutilizada al reintentar, mapeo de errores y estados). Usa `jsdom`                         |
| Playwright smoke (PR 4)       | Entrar como Admin, deslizar por las 6 secciones, salir; el Vendedor no ve lo marcado con `costs.read`                                                                  |
| Playwright Vender (PR 6)      | CU-01 de contado; CU-02 a pagos con plan; CU-03 cliente nuevo y teléfono repetido; botón deshabilitado sin cliente; doble toque crea **una** venta; stock insuficiente |

**E2E en CI:**

- Job `e2e` contra Supabase **local** con el seed, igual que el job `db`, y la app construida.
- Chromium con viewport de celular en cada PR.
- WebKit queda para la corrida nocturna de la Etapa 3.

## 7. Dependencias nuevas

Todas con versión exacta, la estable al instalar:

- **`web`:** `react-router`, `@tanstack/react-query`, `zod`, `@supabase/supabase-js`, `vite-plugin-pwa`, `wrangler` (solo para el deploy).
- **Desarrollo:** `@testing-library/react`, `jsdom`.
- **`e2e`:** `@playwright/test`.

Cada una se justifica en su PR.

## 8. Decisiones nuevas (ADRs)

| ADR | Decisión                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------------------------------- |
| 037 | Rutas por ruta + hojas por parámetro de URL; Track con scroll-snap sincronizado                                           |
| 038 | Vista previa por PR en Cloudflare y migraciones a staging desde `main`. Adelanta parte de F8; crea `inv-web` por el panel |
| 039 | E2E de PR contra Supabase local con el seed. Complementa ADR-024, que es para staging                                     |
| 040 | Fechas con `Intl`, sin `date-fns`                                                                                         |
| 041 | DoD de PWA sin Lighthouse PWA: verificación del manifest y del service worker más instalación real                        |

## 9. DoD de la Etapa 2

- **F3:** entrar con el Admin muestra las 6 secciones; el Vendedor no ve lo marcado con `costs.read`; la app se instala en Android y iPhone desde la vista previa; Vitest de `shared/domain` en verde; smoke E2E en verde.
- **F4:**
  - venta de contado en menos de 1 minuto;
  - imposible guardar sin cliente;
  - a pagos muestra el plan y, al guardar, el plan de la base;
  - doble toque = una venta;
  - cada guardado termina en toast o error con salida (RN-17).
- **Al cierre:**
  - revisión formal del DoD (`docs/planes/etapa-2-revision-dod.md`);
  - **tu venta de prueba en el celular** sobre staging;
  - casillas F3 y F4 marcadas;
  - `docs/avance.md`, el «Punto actual» del roadmap y la presentación actualizados.

## 10. Riesgos

| Riesgo                                                   | Mitigación                                                                                                  |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Cuota distinta en TS y SQL                               | Mismo JSON de casos en Vitest y pgTAP. La UI muestra el plan de la base después de guardar                  |
| Scroll-snap y router se pelean (saltos, historial lleno) | Deslizar usa `replace` y tocar desplaza; prueba E2E de las 6 secciones                                      |
| iPhone: PWA y `100dvh`, áreas seguras                    | Variables `safe-area` ya en tokens; prueba real en iPhone antes del cierre                                  |
| Vista previa expone la app                               | Solo datos ficticios, sesión obligatoria, sin registro abierto (`enable_signup = false` también en staging) |
| Tamaño del JS                                            | Medir en el PR 4; meta de F9: menos de 250 KB gzip                                                          |

## 11. Verificación

- **Cada PR:**
  - `pnpm check` y `pnpm build`;
  - CI con `secret-scan`, `static`, `unit`, `build` y `e2e` (el job `db` corre si toca SQL);
  - el enlace de vista previa abre en el celular.
- **Local:**
  - `pnpm dev` y entrar con `admin@test.local` / `devpassword-local`;
  - vender de contado y a pagos;
  - confirmar el toast, el detalle con folio y el stock rebajado;
  - repetir con `vendedor@test.local` y confirmar que no ve costos.
- **Al final:** venta de prueba en tu celular desde la app instalada; en `inv-staging`, la venta aparece con su folio y el stock bajó.
