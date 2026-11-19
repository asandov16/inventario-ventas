# Revisión del DoD — Etapa 2: App y Vender

**Resultado: cumplido en todo lo automatizable; falta la prueba en el celular.**

Revisión del 12 nov 2026 sobre `main` (`1bed11a`, PRs #11 a #18), con instalación limpia y base reiniciada. Solo queda abierta la instalación y la venta de prueba en un celular real sobre staging, que hace la persona dueña.

## Criterios del plan

| Criterio                                                    | Resultado                                                                                                                               |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Entrar con el Admin muestra las 6 secciones                 | ✅ E2E `shell.spec.ts`: entrar, recorrer las 6 por pestaña y deslizando, salir                                                          |
| El Vendedor no ve lo marcado con `costs.read`               | ✅ E2E: la tarjeta de ganancia no existe para el Vendedor y sí para el Admin                                                            |
| La app se instala en Android y iPhone desde la vista previa | ⏳ **Pendiente.** Automatizado: manifest válido, íconos PNG y service worker activo (`pwa.spec.ts`, ADR-041). Falta la instalación real |
| Vitest de `shared/domain` en verde                          | ✅ 138 pruebas unitarias en total, incluidas las cuotas con el mismo JSON que pgTAP                                                     |
| Smoke E2E en verde                                          | ✅ 17/17 en local y en el job `e2e` de cada PR                                                                                          |
| Venta de contado en menos de 1 minuto                       | ✅ E2E CU-01 mide el tiempo: la venta completa queda muy por debajo de 60 s                                                             |
| Imposible guardar sin cliente                               | ✅ E2E: "Registrar venta" deshabilitado sin cliente; la base también lo exige (RN-01)                                                   |
| A pagos muestra el plan y, al guardar, el plan de la base   | ✅ E2E CU-02: vista previa de 3 cuotas y, después, las cuotas que devolvió `register_sale`                                              |
| Doble toque = una venta                                     | ✅ E2E: doble clic y la base cuenta exactamente una venta nueva                                                                         |
| Cada guardado termina en toast o error con salida (RN-17)   | ✅ Venta, cliente nuevo y cierre de sesión con toast; stock, duplicado y precios con mensaje que dice qué hacer                         |
| Casillas F3 y F4 del roadmap                                | ✅ 11/11 y 7/7                                                                                                                          |

## Otras verificaciones

| Verificación                                 | Resultado                                                                        |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm check` (lint, tipos, unitarias)        | ✅                                                                               |
| `pnpm db:test` (pgTAP desde base reiniciada) | ✅ 215 pruebas en 16 archivos                                                    |
| `pnpm test:db` (concurrencia)                | ✅ 6/6                                                                           |
| Reglas de capas (`eslint-plugin-boundaries`) | ✅ Detectaron y se corrigieron 3 importaciones indebidas durante la etapa        |
| Tamaño del JavaScript                        | ✅ 192 KB comprimido (meta de F9: menos de 250 KB)                               |
| Secretos en el historial                     | ✅ gitleaks, 46 commits, sin hallazgos                                           |
| Staging                                      | ✅ 15 migraciones aplicadas; la app publicada en `staging.inv-web-326.pages.dev` |
| Vista previa por PR                          | ✅ Cada PR del repositorio recibe su enlace                                      |

## Cambios respecto al plan

| Cambio                                                                                                   | Motivo                                                                                           |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Migraciones a staging por el _pooler_ IPv4, con su host en la variable `SUPABASE_POOLER_HOST` (#17, #18) | Los runners de GitHub no tienen IPv6, y el token de CI no puede leer la configuración del pooler |
| El proyecto Pages es `inv-web-326`                                                                       | `inv-web.pages.dev` ya estaba tomado en Cloudflare                                               |
| Versiones anteriores de algunas dependencias                                                             | pnpm rechaza paquetes publicados hace menos de un día; no se agregaron excepciones               |
| `<Can>` no se creó; se usa `usePermission`                                                               | Las reglas de capas no permiten que `shared/ui` use hooks                                        |
| Keep-alive adelantado (ADR-042, PR #21)                                                                  | Supabase avisó que pausaría producción (`inv-main`) por inactividad                              |

## Hallazgos durante la etapa

| Hallazgo                                                                                            | Corrección                                                                            |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| El service worker solo se registraba después de entrar                                              | Se registra desde la pantalla de entrada (PR #14)                                     |
| El mensaje de carrito vacío salía dos veces                                                         | Una sola vez (PR #16)                                                                 |
| `register_sale` marca el método de pago como obligatorio en los tipos generados, pero acepta `null` | Se documentó en el repositorio de ventas; se envía `null` en ventas a pagos sin prima |
| La actualización de PRs apilados con "ours" pudo revertir #17 y #18                                 | Se detectó antes de subir; ahora se compara el diff contra `main` antes de cada push  |

## Pendientes conocidos (no bloquean)

- **Prueba en el celular:** instalar y vender en Android y iPhone desde staging. Es lo único que falta para cerrar la etapa.
- **Alertas de Dependabot**, ninguna llega a la app del celular:
  - `minimatch`, de ESLint;
  - `glob` y `deepmerge`, de `workbox-build`, que solo se usa al construir.
- **Keep-alive (PR #21):** antes del merge hay que crear las variables `PROD_SUPABASE_URL` y `PROD_SUPABASE_ANON_KEY` (runbook `proyecto-pausado.md`).
- **Docker:** cambiar OrbStack por Docker Desktop antes del 2 dic 2026.
