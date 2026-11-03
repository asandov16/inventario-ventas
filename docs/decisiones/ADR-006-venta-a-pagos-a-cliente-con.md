# ADR-006 — Venta a pagos a cliente con cuotas vencidas

- **Estado:** Asumida
- **Fecha:** 2026-11-03
- **Origen:** D-06

## Contexto

Pregunta abierta 7.2 del documento funcional.

## Decisión

Se permite, con un aviso visible antes de confirmar.

## Consecuencias

Costo de cambio bajo: bloquearlo sería una validación más en `register_sale`.
