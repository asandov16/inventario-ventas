# ADR-005 — Preparación para trabajar sin conexión desde el modelo

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-05

## Contexto

Habrá ferias y visitas sin señal. El modo sin conexión es la Etapa 5 (F10), justo después de la beta.

## Decisión

Desde la Etapa 1: ids generados en el celular (`p_id`), fecha real (`client_created_at`), llaves de idempotencia, folio asignado solo por la base y una sola capa de envío (`useRpcMutation`).

## Consecuencias

F10 agrega una cola debajo de `useRpcMutation` sin cambiar tablas ni pantallas.
