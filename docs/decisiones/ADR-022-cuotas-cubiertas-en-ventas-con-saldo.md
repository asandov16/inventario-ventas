# ADR-022 — Cuotas cubiertas en ventas con saldo anterior

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan §8

## Contexto

Con `cum_due = prima + Σ cuotas`, un saldo anterior (total 50 000, pagado 30 000, 2 cuotas de 10 000) mostraría las cuotas pagadas con ₡20 000 pendientes, porque el pago previo no está en la prima.

## Decisión

En `v_installment_status`, el acumulado de cada cuota parte de `total − Σ cuotas` (lo que no se financió), en lugar de `down_payment`.

## Consecuencias

Funciona igual para ventas normales (total − Σ cuotas = prima). Lleva una prueba pgTAP específica.
