# ADR-034 — Los casos de cuotas generan las pruebas SQL

- **Estado:** Aceptada
- **Fecha:** 2026-11-03
- **Origen:** Plan de la Etapa 1, §7

## Contexto

El cálculo de cuotas existe dos veces: en SQL (`private.calc_installments`, la autoridad) y en TypeScript (la vista previa de la pantalla de cobro, Etapa 2). Si difieren, la persona ve un plan y la base guarda otro. El roadmap proponía leer el JSON de casos desde pgTAP con `pg_read_file`, pero ese archivo no existe dentro del contenedor de la base.

## Decisión

- `shared/fixtures/installments.cases.json` es la única fuente de casos.
- `scripts/gen-installments-pgtap.ts` (`pnpm gen:installment-tests`) genera `supabase/tests/20_calc_installments.sql` desde ese JSON.
- El job `db` del CI regenera el archivo y falla si difiere del que está en el repositorio.
- Vitest usará el mismo JSON para la función TypeScript (Etapa 2).

## Consecuencias

Un caso nuevo se agrega solo en el JSON y se vuelve a generar el SQL. El archivo generado no se edita a mano.
