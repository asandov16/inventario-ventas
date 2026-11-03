# Base de datos (Supabase / PostgreSQL)

La base es la autoridad de reglas, permisos y datos. Contenido (se llena desde la Etapa 1):

| Carpeta              | Qué contiene                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------- |
| `migrations/`        | SQL versionado, solo hacia adelante. Se crean con `supabase migration new <nombre>` (ADR-029) |
| `tests/`             | Pruebas pgTAP: `00_schema.sql`, `10_rls.sql`, `20_register_sale.sql`…                         |
| `bootstrap/prod.sql` | Negocio, roles, permisos y catálogos para producción, sin marca (D-19)                        |
| `seed.sql`           | Datos ficticios locales y de staging, derivados del prototipo v2                              |
| `functions/`         | Edge Functions (vacío en la beta; listo para WhatsApp)                                        |

Comandos: `pnpm db:start`, `pnpm db:reset`, `pnpm db:test` (reinicia la base y corre pgTAP), `pnpm test:db` (concurrencia), `pnpm db:demo` (recorrido narrado), `pnpm gen:types`, `pnpm gen:installment-tests`, `pnpm lint:sql`. Requieren Docker.

## Usuarios locales de prueba

Solo existen en la base local (ADR-033). Contraseña: `devpassword-local`.

| Correo                | Rol           |
| --------------------- | ------------- |
| `admin@test.local`    | Administrador |
| `admin2@test.local`   | Administrador |
| `vendedor@test.local` | Vendedor      |

Supabase Studio local: http://127.0.0.1:54323
