# ADR-042 — Keep-alive adelantado a la Etapa 2

- **Estado:** Aceptada
- **Fecha:** 2026-11-12
- **Origen:** Aviso de Supabase: el proyecto de producción `inv-main` se iba a pausar por inactividad

## Contexto

Supabase Free pausa un proyecto después de 7 días sin actividad. El keep-alive estaba previsto para la Etapa 4 (F8-T07). Pero producción no recibe tráfico hasta entonces, y el aviso de pausa llegó antes.

Al probarlo aparecieron dos límites:

- Una consulta sin llave recibe 401, y no está claro que cuente como actividad.
- La raíz de la API REST (`/rest/v1/`) también rechaza la llave pública. Y producción todavía no tiene `ping()`, porque no tiene migraciones.

## Decisión

- **Adelantar F8-T07:** el Worker `inv-keepalive` de Cloudflare, con Cron cada 6 horas, consulta staging y producción con la llave pública (_anon key_) de cada uno:
  - `ping()` cuando existe;
  - si no existe, el endpoint `/graphql/v1`. Es una función dentro de Postgres, así que la consulta llega a la base aunque no haya tablas.
- **Despliegue:** lo hace `.github/workflows/keepalive.yml` en cada merge que toque el Worker, o a mano. Después de desplegar, consulta una vez cada proyecto.
- **Valores:**
  - staging sale de su entorno de GitHub;
  - producción sale de las variables de repositorio `PROD_SUPABASE_URL` y `PROD_SUPABASE_ANON_KEY`. Son valores públicos por diseño, pero no viven en el repositorio.
- **Nombre real:** el proyecto de producción se llama `inv-main` (ID `tkutayzwgalkavwwurvg`), no `inv-prod`. Los runbooks se corrigen.

## Consecuencias

- Ningún proyecto debería volver a pausarse mientras el plan sea Free. Si una ejecución falla, queda marcada en los logs del Worker.
- La consulta de salud diaria de F8-T08 y el resto de F8 siguen en la Etapa 4.
- ADR-017 sigue en pie: pasar a Pro al cumplir el primer mes con datos reales.
