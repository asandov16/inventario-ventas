# Revisión del DoD — Etapa 1: Núcleo de datos

**Resultado: cumplido.** Revisión del 3 nov 2026 sobre `main` (`204e7b8`) con instalación limpia y base reiniciada. Se encontró una brecha (RN-13 sin prueba) y una debilidad (pruebas dependientes del orden); ambas se corrigen en el PR de esta revisión.

## Criterios del roadmap y del plan

| Criterio                                                           | Resultado                                                                                      |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `supabase db reset` aplica las 15 migraciones y carga el seed      | ✅                                                                                             |
| `supabase test db` en verde                                        | ✅ 215 pruebas pgTAP en 16 archivos                                                            |
| `supabase db lint` sin errores (nivel advertencia)                 | ✅                                                                                             |
| Tipos generados sin diferencias                                    | ✅                                                                                             |
| El job `db` del CI corre en PRs que tocan `supabase/**`            | ✅ PRs #6, #7 y #8, y en `main` tras el merge                                                  |
| Cada regla RN aplicable en la base con caso feliz y de rechazo     | ✅ tras agregar la prueba de RN-13 (tabla abajo)                                               |
| Pruebas de concurrencia en verde                                   | ✅ 6/6, estables en 4 corridas seguidas                                                        |
| Una RPC sin `require_permission` hace fallar la prueba de catálogo | ✅ probado con una función de prueba dentro de una transacción revertida: la prueba la detectó |
| `pnpm lint:sql`, `pnpm check`, formato                             | ✅                                                                                             |
| Sin secretos en el historial                                       | ✅ gitleaks, 21 commits                                                                        |
| Casillas F1 y F2 del roadmap                                       | ✅ 12/12 y 14/14                                                                               |
| Demo `pnpm db:demo`                                                | ✅ recorrido completo                                                                          |

## Cobertura de reglas de negocio

| Regla                          | Caso feliz                                             | Caso de rechazo                                                                         |
| ------------------------------ | ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| RN-01 Cliente obligatorio      | `30` venta con cliente; `34` cliente nuevo             | `11` venta sin cliente; `30` cliente de otro negocio; `34` teléfono repetido → `exists` |
| RN-02 No vender sin stock      | `30` venta descuenta stock                             | `30` agotado y cantidad mayor; `11` stock negativo; concurrencia: última unidad         |
| RN-03 Plazos 1–3 meses         | `30` venta a 2 meses; `20` casos                       | `30` y `11` plazo de 4 meses                                                            |
| RN-04 Cálculo de cuotas        | `20` (11 casos generados del JSON compartido)          | `20` cuota en ₡0 → `term_too_long`                                                      |
| RN-05 Prima                    | `30` prima de 5 000                                    | `30` y `11` prima igual al total                                                        |
| RN-06 Abonos                   | `31` abono parcial y cuota más antigua primero         | `31` mayor que el saldo; concurrencia: dos abonos que suman más que el saldo            |
| RN-07 Cuota vencida            | `31` y `33` cuota vencida                              | `33` cuotas futuras siguen pendientes                                                   |
| RN-08 Cuenta liquidada         | `31` saldo 0 → `paid`                                  | `31` no acepta más abonos                                                               |
| RN-09 Anulación                | `32` Administrador anula                               | `32` Vendedor no puede; doble anulación; concurrencia                                   |
| RN-10 Stock bajo               | `50` `ok` / `low` / `out`                              | `50` productos sobre el mínimo quedan `ok`                                              |
| RN-11 Stock al vender y anular | `30` baja; `32` regresa                                | `30` doble defensa con `stock >= qty`                                                   |
| RN-12 Nada se borra            | `11` anular sí se permite                              | `11` `DELETE` y `TRUNCATE` fallan incluso como `postgres`                               |
| RN-13 Colones enteros          | `00` todas las columnas de dinero son enteras          | `00` ninguna columna decimal (**prueba nueva**)                                         |
| RN-14 Métodos de pago          | `13` los tres iniciales; `41` agregar                  | `41` nombre repetido                                                                    |
| RN-15 Folio                    | `30` folio siguiente; concurrencia: 20 folios seguidos | concurrencia: sin huecos ni repetidos                                                   |
| RN-16 Precio al momento        | `30` la línea conserva precio y costo                  | `30` cambiar el precio después no altera la venta                                       |
| RN-17 Toda acción responde     | No aplica a la base: se cubre en la Etapa 2 (interfaz) | —                                                                                       |
| RN-18 Duplicados               | `30`, `31`, `40` `replay` y confirmación               | `30`, `31`, `40` `possible_duplicate`; concurrencia: misma llave a la vez               |

## Hallazgos y correcciones

| Hallazgo                                                                                              | Corrección                                                                                                                   |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| RN-13 no tenía prueba (el esquema sí la cumplía)                                                      | Prueba en `00_schema.sql`: ninguna columna `numeric`, `real`, `double precision` ni `money`                                  |
| `pnpm db:test` fallaba si antes se corría `pnpm test:db` o `pnpm db:demo`, porque esas escriben datos | `pnpm db:test` ahora reinicia la base con el seed antes de las pruebas; su resultado ya no depende de lo que se corrió antes |

## Pendientes conocidos (no bloquean)

- El proyecto `inv-web` de Cloudflare se crea en la Etapa 4.
- Alerta de Dependabot en `minimatch`: media, solo herramientas de desarrollo; espera una versión nueva de ESLint.
- Prueba de OrbStack: cambiar a Docker Desktop antes del 2 dic 2026.
