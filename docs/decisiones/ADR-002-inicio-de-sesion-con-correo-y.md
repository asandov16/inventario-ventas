# ADR-002 — Inicio de sesión con correo y contraseña

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** D-02

## Contexto

La beta tiene pocos usuarios conocidos; no hace falta registro público ni PIN.

## Decisión

Supabase Auth con correo y contraseña. Registro público desactivado (`enable_signup = false`). Contraseña mínima de 10 caracteres. Los usuarios se crean a mano.

## Consecuencias

Teléfono + PIN y bloqueo tras 5 intentos quedan para después de la beta (ADR-018).
