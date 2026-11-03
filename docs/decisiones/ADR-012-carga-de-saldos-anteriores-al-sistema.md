# ADR-012 — Carga de saldos anteriores al sistema

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-12

## Contexto

Las deudas actuales están anotadas en un cuaderno.

## Decisión

Formulario de Administrador "Cargar saldo anterior": crea una venta con `source = 'legacy_import'`, descripción en texto, lo ya pagado y las cuotas restantes. No mueve stock.

## Consecuencias

El cálculo de cuotas cubiertas se corrige en ADR-022.
