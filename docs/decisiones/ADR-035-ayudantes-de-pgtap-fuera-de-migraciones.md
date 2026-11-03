# ADR-035 — Ayudantes de pgTAP fuera de las migraciones

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan de la Etapa 1, §7

## Contexto

Las pruebas necesitan actuar como un usuario concreto (Administrador, Vendedor, otro negocio, anónimo). Si esas funciones vivieran en una migración, llegarían a producción.

## Decisión

`supabase/tests/000_setup.sql` crea el esquema `tests` con `authenticate_as`, `authenticate_as_anon`, `clear_authentication` y `create_user`. Ese archivo no usa transacción para que los ayudantes queden disponibles para las demás pruebas, y solo se ejecuta en la base local o del CI.

## Consecuencias

El nombre del archivo empieza con `000` para que corra primero. Ninguna migración puede depender del esquema `tests`.
