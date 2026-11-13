# Avance del proyecto

Bitácora de lo completado por etapa. Se actualiza al cerrar cada etapa, junto con la presentación de avance (privada, en claude.ai).

**Estado al 12 nov 2026:** etapas 0 y 1 completas; la Etapa 2 tiene todo el código en `main` y la revisión automatizada aprobada, y solo le falta la prueba en el celular. Siguiente: Etapa 3, Operación diaria (espera visto bueno del plan).

| Etapa                   | Fases        | Estado                                      | Cierre     | PRs            |
| ----------------------- | ------------ | ------------------------------------------- | ---------- | -------------- |
| **0 Fundaciones**       | F0           | ✅ Completa                                 | 3 nov 2026 | #1, #3, #4, #5 |
| **1 Núcleo de datos**   | F1 + F2      | ✅ Completa                                 | 3 nov 2026 | #6, #7, #8, #9 |
| **2 App y Vender**      | F3 + F4      | 🔶 En cierre: falta la prueba en el celular | —          | #11–#18        |
| **3 Operación diaria**  | F6 + F5 + F7 | ⏭️ Siguiente                                | —          | —              |
| **4 Producción y beta** | F8 + F9      | Pendiente                                   | —          | —              |
| **5 Sin conexión**      | F10          | Pendiente                                   | —          | —              |

## Etapa 0 — Fundaciones (3 nov 2026)

**Resultado:** el repositorio, las herramientas, las cuentas y el CI quedaron listos para construir.

- Repositorio público en GitHub con la regla `protect-main`: PR obligatorio, check `ci` requerido, historial lineal, sin force-push. Escaneo de secretos, protección al subir y Dependabot activos.
- Repositorio privado `inventario-backups` para los respaldos (ADR-021).
- Entornos `staging` y `production` (este último con revisor). Proyectos de Supabase `inv-staging` y, para producción, `inv-main`. Cuenta de Cloudflare con token de CI. 11 secretos configurados.
- Herramientas: pnpm con Node 24 fijado, ESLint con fronteras por capa, Prettier, sqlfluff, gitleaks y hooks de lefthook.
- `CLAUDE.md`, plan de implementación, glosario, runbook de cuentas y ADR-001 a ADR-030.
- Revisión del DoD aprobada; su corrección fue el PR #5 (`pnpm dev` levanta también Supabase local).

**Cambios respecto al plan:** el proyecto `inv-web` de Cloudflare se pospuso a la Etapa 4. Pages ahora es parte de Workers, y `wrangler` no lo crea desde la raíz del workspace. Necesitará un ADR en esa etapa.

## Etapa 1 — Núcleo de datos (3 nov 2026)

**Resultado:** el negocio se puede operar solo con llamadas a la base: vender de contado y a pagos, cobrar, anular, ingresar mercadería y cargar saldos anteriores.

| Entrega                 | PR  | Contenido                                                                                                       |
| ----------------------- | --- | --------------------------------------------------------------------------------------------------------------- |
| Modelo y seguridad (F1) | #6  | 20 tablas, roles y 16 permisos, RLS en todas, nada se borra, seed local y bootstrap de producción               |
| Ventas y cobros (F2)    | #7  | Cálculo de cuotas, clientes, `register_sale`, `register_payment`, `void_sale`, `register_legacy_balance`        |
| Inventario y lecturas   | #8  | Productos e ingresos, configuración, recordatorios, vistas de inicio, cobros y análisis, Realtime, concurrencia |
| Revisión del DoD        | #9  | Prueba de RN-13 y `pnpm db:test` independiente del orden                                                        |

- **Números:** 15 migraciones, 215 pruebas pgTAP en 16 archivos y 6 pruebas de concurrencia.
- **Reglas:** RN-01 a RN-18 cubiertas en la base con un caso feliz y uno de rechazo, salvo RN-17, que es de interfaz y pasa a la Etapa 2. Detalle en [la revisión del DoD](planes/etapa-1-revision-dod.md).
- **Decisiones nuevas:** ADR-031 a ADR-036.
- **Demo:** `pnpm db:demo`, un recorrido narrado de las reglas.

**Cambios respecto al plan:**

- Hay 20 tablas, no 19: los costos de cada ingreso van en una tabla aparte (`inventory_movement_costs`, ADR-036), para que el Vendedor no los vea.
- Dos solicitudes simultáneas con la misma llave fallaban en el índice único. Ahora se serializan con un bloqueo por llave (`private.lock_key`), y RN-18 queda cubierta también en paralelo.

## Etapa 2 — App y Vender (código completo el 7 nov 2026; falta la prueba en el celular)

**Resultado:** una app instalable con las 6 secciones, sesión y permisos, y la pantalla Vender de punta a punta: de contado y a pagos, siempre con cliente.

| Entrega                  | PR            | Contenido                                                                                                               |
| ------------------------ | ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Esqueleto de la app (F3) | #11           | 6 secciones que se deslizan, barra de pestañas, hojas que se cierran con Atrás, dinero, teléfono, fechas y cuotas en TS |
| Staging y vista previa   | #12, #17, #18 | Vista previa por PR y staging en cada merge (Cloudflare `inv-web-326`); migraciones por el pooler IPv4                  |
| Sesión y respuestas (F3) | #13           | Entrar y salir, perfil, permisos, toasts y diálogos, `useRpcMutation` con llave de idempotencia, errores en español     |
| PWA y E2E (F3)           | #14           | Instalable, aviso de versión nueva, "Sin conexión", pista de deslizar, Playwright en cada PR                            |
| Catálogo y carrito (F4)  | #15           | Tarjetas con "Quedan N", búsqueda sin tildes, categorías, carrito que no pasa el stock                                  |
| Cobro y cliente (F4)     | #16           | Buscador y cliente nuevo, plan de cuotas en vivo, registrar venta, posible duplicado, detalle con folio                 |

- **Números:** 138 pruebas unitarias, 17 E2E, 215 pgTAP y 6 de concurrencia. JavaScript de 192 KB comprimido.
- **Decisiones nuevas:** ADR-037 a ADR-042.
- **Detalle:** [la revisión del DoD](planes/etapa-2-revision-dod.md).

**Cambios respecto al plan:**

- El proyecto de Cloudflare se creó en esta etapa, adelantado de la Etapa 4. Su subdominio es `inv-web-326` porque `inv-web` estaba tomado.
- El keep-alive (F8-T07) se adelantó porque Supabase avisó que pausaría producción (ADR-042).
- El proyecto de producción en Supabase se llama `inv-main`, no `inv-prod`.

## Pendientes conocidos

| Pendiente                                                                                                   | Cuándo                                    |
| ----------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Cambiar OrbStack por Docker Desktop (vence la prueba)                                                       | Antes del 2 dic 2026                      |
| Prueba de instalación y venta en el celular (Etapa 2)                                                       | Antes de cerrar la Etapa 2                |
| Variables `PROD_SUPABASE_URL` y `PROD_SUPABASE_ANON_KEY` para el keep-alive (PR #21)                        | Antes del merge del #21                   |
| Alertas de Dependabot: `minimatch` (ESLint), `glob` y `deepmerge` (`workbox-build`); ninguna llega a la app | Con versiones nuevas de esas herramientas |

## Cómo se actualiza

Al cerrar cada etapa, después de la revisión del DoD:

1. Actualizar el «Punto actual» al inicio de `docs/roadmap.md`. Agregar aquí la sección de la etapa: resultado, PRs, números y cambios respecto al plan. Actualizar la tabla de estado y los pendientes.
2. Actualizar la presentación de avance:
   - portada (fecha y etapas completas);
   - «Dónde estamos»;
   - la tarjeta de la etapa en «Hoja de ruta»;
   - una diapositiva nueva para la etapa;
   - «Pendientes y avisos»;
   - «Lo que sigue».
