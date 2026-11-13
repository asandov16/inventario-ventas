# Keep-alive (Cloudflare Worker)

Supabase Free pausa un proyecto después de 7 días sin actividad. Este Worker manda cada 6 horas una consulta autenticada, con la llave pública (_anon key_), a staging y a producción (F8-T07, ADR-042):

- `ping()` cuando el proyecto ya tiene las migraciones (staging);
- el endpoint de GraphQL cuando todavía no (producción, hasta la Etapa 4). Es una función dentro de Postgres, así que llega a la base aunque no haya tablas. La raíz de la API REST no sirve: rechaza la llave pública.

Si un proyecto no responde o rechaza la llave, la ejecución falla y queda marcada en Cloudflare → Workers → `inv-keepalive` → Logs.

Lo despliega `.github/workflows/keepalive.yml` en cada merge a `main` que toque esta carpeta. Las URLs y llaves se pasan al desplegar y no viven en el repositorio.
