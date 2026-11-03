# ADR-031 — Valores de estado y tipos en inglés

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan de la Etapa 1, §3

## Contexto

El roadmap usaba valores en español dentro de la base (`contado`, `pagos`, `prima`, `migracion`). ADR-027 fija el código en inglés.

## Decisión

Los valores guardados en columnas de tipo y estado van en inglés, como `text` con `CHECK`:

| Columna                    | Valores                                                                                                     |
| -------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `sales.type`               | `cash`, `installments`                                                                                      |
| `sales.source`             | `app`, `legacy_import`                                                                                      |
| `payments.kind`            | `cash`, `down_payment`, `payment`, `legacy`                                                                 |
| `inventory_movements.type` | `initial`, `restock`, `sale`, `void`, `adjustment`                                                          |
| `activity_log.type`        | `sale`, `legacy_balance`, `payment`, `void`, `restock`, `adjustment`, `product_created`, `customer_created` |
| Roles                      | `admin`, `seller`                                                                                           |

## Consecuencias

La interfaz traduce cada valor con `messages.es.ts`. `activity_log` no guarda frases: guarda tipo y datos, y la interfaz arma el texto en español. Las equivalencias están en `docs/glosario.md`.
